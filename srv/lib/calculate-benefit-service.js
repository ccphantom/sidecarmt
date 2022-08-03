const cds = require("@sap/cds");
var log = require("cf-nodejs-logging-support");

class CalculateBenefitService extends cds.ApplicationService {
  async init() {
    this.on("calculateBenefit", this.calculateBenefit);
    await super.init();
  }
  async calculateBenefit(req) {
    const payFrequencyMap = this.getPayFrequencyMap();
    // const db = await cds.connect.to("db");
    // const { ConstantParameter } = db.entities("com.reachnett.union");
    // const logSwitch = await SELECT.one`value`.from(ConstantParameter)
    //   .where`parameter = 'LOG'`;
    const tx = cds.tx(req);
    const { ConstantParameter } = cds.entities;
    const us = await cds.connect.to('UnionService');
    const logSwitch = await us.read(SELECT.one`value`.from(ConstantParameter).where`parameter = 'LOG'`);
    
    if (!logSwitch && logSwitch != null && logSwitch.value == "ON") {
      log.setLoggingLevel("info");
      log.registerCustomFields(["request_body", "response_body"]);
    }
    let unionBenefits = [];
    const { unionBenefitParameters } = req.data;
    if (!logSwitch && logSwitch != null && logSwitch.value == "ON") {
      log.info("request body", { request_body: unionBenefitParameters });
    }
    const customerInfo = unionBenefitParameters.customerInfo;
    const calculationBase = unionBenefitParameters.calculationBase;
    const { passValidation, returnMessage } =
      this.validCustomerInfo(customerInfo);
    if (passValidation == false) {
      return req.reply(returnMessage);
    }
    for (const unionBenefitParameter of calculationBase) {
      const { employeeNumber, unionBenefitParametersByEmployee } =
        unionBenefitParameter;
      let unionBenefit = { employeeNumber: employeeNumber };
      unionBenefit["unionBenefitResults"] = await this.buildUnionBenefitResults(
        customerInfo,
        unionBenefitParametersByEmployee,
        payFrequencyMap
      );
      unionBenefits.push(unionBenefit);
    }
    if (!logSwitch && logSwitch != null && logSwitch.value == "ON") {
      log.info("response body", { response_body: unionBenefits });
    }
    return req.reply({ unionBenefits: unionBenefits });
  }

  validCustomerInfo(customerInfo) {
    let passValidation = true;
    let returnMessage = {};
    if (customerInfo.length == 0) {
      passValidation = false;
      returnMessage["messageType"] = "error";
      returnMessage["message"] = "Customer information is empty";
    }
    return {
      passValidation,
      returnMessage,
    };
  }

  async buildUnionBenefitResults(
    customerInfo,
    unionBenefitParametersByEmployee,
    payFrequencyMap
  ) {
    let unionBenefitResults = [];
    for (const unionBenefitParameterByEmployee of unionBenefitParametersByEmployee) {
      let { payPeriodInfo, benefitBase, benefitOverride, benefitCumulation } =
        unionBenefitParameterByEmployee;

      let returnValidation = this.validateInputData(benefitBase);
      let passValidation = returnValidation.passValidation;
      let returnMessage = returnValidation.returnMessage;
      if (typeof benefitOverride === "undefined") {
        benefitOverride = [];
      }
      if (passValidation == true) {
        returnValidation = this.validateBenefitOverride(benefitOverride);
        passValidation = returnValidation.passValidation;
        returnMessage = returnValidation.returnMessage;
      }

      let unionBenefitResult = {};
      unionBenefitResult["payPeriodInfo"] = payPeriodInfo;
      if (passValidation == false) {
        unionBenefitResult["message"] = returnMessage;
        unionBenefitResults.push(unionBenefitResult);
        continue;
      }

      let unionBenefitRecords = await this.buildUnionBenefitRecords(
        benefitBase,
        benefitOverride,
        benefitCumulation,
        customerInfo,
        payPeriodInfo,
        payFrequencyMap
      );
      unionBenefitResult["unionBenefitResult"] = unionBenefitRecords;
      unionBenefitResult["message"] = {
        messageType: "Info",
        message: "Calculated Successfully",
      };

      unionBenefitResults.push(unionBenefitResult);
    }
    return unionBenefitResults;
  }

  validateInputData(benefitBase) {
    let passValidation = true;
    let returnMessage = {};
    if (benefitBase.length == 0) {
      passValidation = false;
      returnMessage["messageType"] = "error";
      returnMessage["message"] = "Benefit base table is empty";
      return {
        passValidation,
        returnMessage,
      };
    }

    return {
      passValidation,
      returnMessage,
    };
  }

  validateBenefitOverride(benefitOverrides) {
    let passValidation = true;
    let returnMessage = {};
    if (benefitOverrides.length > 0) {
      for (const benefitOverride of benefitOverrides) {
        if (!("benefitCode" in benefitOverride)) {
          passValidation = false;
          returnMessage["messageType"] = "error";
          returnMessage["message"] = "Missing Benefit Code";

          return {
            passValidation,
            returnMessage,
          };
        }
      }
    }

    return {
      passValidation,
      returnMessage,
    };
  }

  async buildUnionBenefitRecords(
    benefitBases,
    benefitOverride,
    benefitCumulation,
    customerInfo,
    payPeriodInfo,
    payFrequencyMap
  ) {
    // 1. Initialize Response
    let unionBenefits = [];

    // 3. Read from Database
    const db = await cds.connect.to("db");
    const { UnionFringes } = db.entities("com.reachnett.union");
    // const { UnionFringes } = cds.entity;
    const criteriaGlobalUnionCode = [
      ...new Set(
        benefitBases.map((element) => {
          return element.globalUnionCode;
        })
      ),
    ];

    const unionFringes = await db.read(UnionFringes).where({
      customerID: customerInfo.customerID,
      and: { unionCode: { in: criteriaGlobalUnionCode } },
    });

    // 4. Start Processing Benefit Base Line Items
    benefitBases.sort(
      (a, b) =>
        a.workdate.localeCompare(b.workdate) ||
        a.earnCode.localeCompare(b.earnCode) ||
        a.baseCode.localeCompare(b.baseCode) ||
        a.globalUnionCode.localeCompare(b.globalUnionCode)
    );

    let aFixUnionBenefits = [];
    benefitBases.forEach((benefitBase) => {
      // 4.1. Gather all associated benefits for this line item setup
      let candidateBenefits = JSON.parse(JSON.stringify(unionFringes)); //deep copy
      let candidatePersonalBenefits = JSON.parse(
        JSON.stringify(benefitOverride)
      );
      candidateBenefits = candidateBenefits.filter((benefit) => {
        const skipMonthlyBenefit = this.checkMonthlyBenefit(
          benefit,
          payPeriodInfo,
          payFrequencyMap,
          benefitCumulation
        );
        // knock out unrelative
        return (
          (benefit.unionCode == benefitBase.globalUnionCode ||
            benefit.unionCode == "*") &&
          (benefit.unionClass == benefitBase.globalClassCode ||
            benefit.unionClass == "*") &&
          (benefit.unionCraft == benefitBase.globalCraftCode ||
            benefit.unionCraft == "*") &&
          (benefit.projectID == benefitBase.projectID ||
            benefit.projectID == "*") &&
          benefit.validFrom.split("T")[0] <= benefitBase.workdate &&
          benefit.validTo.split("T")[0] >= benefitBase.workdate &&
          benefit.baseCode == benefitBase.earnCode &&
          !skipMonthlyBenefit
        );
      });

      candidatePersonalBenefits = candidatePersonalBenefits.filter((personalBenefit) => {
        const skipMonthlyBenefit = this.checkMonthlyBenefit(
          personalBenefit,
          payPeriodInfo,
          payFrequencyMap,
          benefitCumulation
        );
        return (
          (personalBenefit.unionCode == benefitBase.globalUnionCode ||
            personalBenefit.unionCode == "*") &&
          (personalBenefit.unionClass == benefitBase.globalClassCode ||
            personalBenefit.unionClass == "*") &&
          (personalBenefit.unionCraft == benefitBase.globalCraftCode ||
            personalBenefit.unionCraft == "*") &&
          (personalBenefit.projectID == benefitBase.projectID || personalBenefit.projectID == "*") &&
          personalBenefit.beginDate <= benefitBase.workdate &&
          personalBenefit.endDate >= benefitBase.workdate &&
          !skipMonthlyBenefit
          // && elmt.baseBucket == benefitBase.earnCode
        );
      });

      let personalBenefitCodes = [
        ...new Set(candidatePersonalBenefits.map((e) => e.benefitCode)),
      ]; // merge generic into personal benefits if not duplicated
      candidateBenefits.forEach((elmt) => {
        if (!personalBenefitCodes.includes(elmt.unionFringe)) {
          let helpArray = {
            customerID: elmt.customerID,
            unionInfoPointer: elmt.unionInfoPointer,
            benefitCode: elmt.unionFringe,
            projectID: elmt.projectID,
            endDate: elmt.validTo,
            beginDate: elmt.validFrom,
            benefitDescrition: elmt.fringeDescription,
            benefitRate: elmt.fringeRate,
            calcMethod: elmt.calculationMethod,
            baseBucket: elmt.baseCode,
            paymentModel: elmt.paymentModel,
            unionCode: elmt.unionCode,
            unionCraft: elmt.unionCraft,
            unionClass: elmt.unionClass,
          };
          candidatePersonalBenefits.push(helpArray);
        }
      });

      candidatePersonalBenefits = candidatePersonalBenefits.filter(
        (personalBenefit) => {
          return personalBenefit.baseBucket == benefitBase.earnCode;
        }
      );

      candidatePersonalBenefits.sort((a, b) => {
        // prioritize by specification
        // let aCode = ( a.benefitCode || '' ).toUpperCase();
        // let bCode = ( b.benefitCode || '' ).toUpperCase();
        let aCode = a.benefitCode.toUpperCase();
        let bCode = b.benefitCode.toUpperCase();
        if (aCode < bCode) {
          return -1;
        } else if (aCode > bCode) {
          return 1;
        } else {
          if (
            a.projectID === b.projectID &&
            a.unionCode === b.unionCode &&
            a.unionClass === b.unionClass &&
            a.unionCraft === b.unionCraft
          ) {
            return 0;
          } else if (
            a.projectID != "*" &&
            a.unionCode != "*" &&
            a.unionClass != "*" &&
            a.unionCraft != "*"
          ) {
            return -1;
          } else if (
            b.projectID != "*" &&
            b.unionCode != "*" &&
            b.unionClass != "*" &&
            b.unionCraft != "*"
          ) {
            return 1;
          } else if (
            a.projectID == "*" &&
            a.unionCode != "*" &&
            a.unionClass != "*" &&
            a.unionCraft != "*"
          ) {
            return -1;
          } else if (
            b.projectID == "*" &&
            b.unionCode != "*" &&
            b.unionClass != "*" &&
            b.unionCraft != "*"
          ) {
            return 1;
          } else if(
            a.projectID != "*" &&
            a.unionCode != "*" &&
            a.unionClass == "*" &&
            a.unionCraft == "*"
          ){
            return -1;
          } else if (
            b.projectID != "*" &&
            b.unionCode != "*" &&
            b.unionClass == "*" &&
            b.unionCraft == "*"
          ) {
            return 1;
          } else if (
            a.projectID == "*" &&
            a.unionCode != "*" &&
            a.unionClass == "*" &&
            a.unionCraft == "*"
          ) {
            return -1;
          } else if (
            b.projectID == "*" &&
            b.unionCode != "*" &&
            b.unionClass == "*" &&
            b.unionCraft == "*"
          ) {
            return 1;
          } else {
            return 0;
          }
        }
      });

      candidatePersonalBenefits = candidatePersonalBenefits.filter(
        (elmt, index, array) => {
          if (
            index ==
            array.findIndex((elmt2) => {
              return elmt2.benefitCode == elmt.benefitCode;
            })
          ) {
            return true;
          } else {
            return false;
          }
        }
      );

      //4.2 Calculate
      let helpRate = null;
      let helpHours = null;
      let helpAmount = null;
      let helpUnionBenefit = null;
      candidatePersonalBenefits.forEach((personalBenefit) => {
        let bIsFixedAmountBenfit = false;
        switch (personalBenefit.calcMethod) {
          case "H": // hourly rate
            helpRate = personalBenefit.benefitRate;
            helpHours = benefitBase.hours;
            helpAmount = helpHours * helpRate;
            break;
          case "F": // fixed amount
            bIsFixedAmountBenfit = true;
            helpRate = personalBenefit.benefitRate;
            helpHours = benefitBase.hours;
            helpAmount = personalBenefit.benefitRate;
            break;
          case "A": // percentage
            helpRate = personalBenefit.benefitRate;
            helpHours = benefitBase.hours;
            helpAmount =
              (benefitBase.amount * personalBenefit.benefitRate) / 100;
            break;
          default:
            break;
        }
        helpUnionBenefit = {
          customerID: customerInfo.customerID,
          workdate: benefitBase.workdate,
          benefitCode: personalBenefit.benefitCode,
          globalUnionCode: personalBenefit.unionCode,
          globalCraftCode: personalBenefit.unionCraft,
          globalClassCode: personalBenefit.unionClass,
          projectID: personalBenefit.projectID,
          sapALZNR: benefitBase.sapALZNR,
          sapC1ZNR: benefitBase.sapC1ZNR,
          sapABART: benefitBase.sapABART,
          sapAPZNR: benefitBase.sapAPZNR,
          sapUNPTR: benefitBase.sapUNPTR,
          sapTRFGR: benefitBase.sapTRFGR,
          sapTRFST: benefitBase.sapTRFST,
          sapPOSNR: benefitBase.sapPOSNR,
          calcMethod: personalBenefit.calcMethod,
          rate: helpRate,
          hours: helpHours,
          amount: helpAmount,
        };
        if (bIsFixedAmountBenfit) {
          aFixUnionBenefits.push(helpUnionBenefit);
        } else {
          unionBenefits.push(helpUnionBenefit);
        }
      });
    });

    unionBenefits = await this.resolveRoundingIssue(unionBenefits);
    aFixUnionBenefits = await this.updateFixUnionBenefits(aFixUnionBenefits);

    for (const fixUnionBenefit of aFixUnionBenefits) {
      unionBenefits.push(fixUnionBenefit);
    }
    return unionBenefits;
  }

  async updateFixUnionBenefits(aFixUnionBenefits) {
    let aBenefitCountByWageType = [];
    let aUnionBenefits = [];

    for (let oFixUnionBenefit of aFixUnionBenefits) {
      const iRecordIndex = aBenefitCountByWageType.findIndex(
        (oBenefitCountByWageType) =>
          oBenefitCountByWageType.benefitCode === oFixUnionBenefit.benefitCode
      );

      if (iRecordIndex > -1) {
        aBenefitCountByWageType[iRecordIndex].count =
          aBenefitCountByWageType[iRecordIndex].count + 1;
      } else {
        aBenefitCountByWageType.push({
          benefitCode: oFixUnionBenefit.benefitCode,
          count: 1,
        });
      }
    }

    for (const oBenefitCountByWageType of aBenefitCountByWageType) {
      let iTotalAmount = 0;
      let iCount = 0;
      let iTargetAmount = 0;
      for (let oFixUnionBenefit of aFixUnionBenefits) {
        if (
          oFixUnionBenefit.benefitCode === oBenefitCountByWageType.benefitCode
        ) {
          if (iCount == 0) {
            iTargetAmount = this.roundTo2Decimal(
              Number(oFixUnionBenefit.amount).toFixed(6)
            );
          }
          iCount = iCount + 1;
          if (iCount < oBenefitCountByWageType.count) {
            oFixUnionBenefit.amount = this.roundTo2Decimal(
              Number(oFixUnionBenefit.amount / oBenefitCountByWageType.count)
            );
            iTotalAmount = iTotalAmount + oFixUnionBenefit.amount;
          } else {
            // last record
            oFixUnionBenefit.amount = this.roundTo2Decimal(
              iTargetAmount - iTotalAmount
            );
          }
          aUnionBenefits.push(oFixUnionBenefit);
        }
      }
    }
    return aUnionBenefits;
  }

  async resolveRoundingIssue(aUnionBenefits) {
    let aBenefitGroupByBenefitCode = [];
    for (let oUnionBenefit of aUnionBenefits) {
      const iRecordIndex = aBenefitGroupByBenefitCode.findIndex(
        (oBenefitGroupByWageType) =>
          oBenefitGroupByWageType.benefitCode === oUnionBenefit.benefitCode
      );

      if (iRecordIndex > -1) {
        aBenefitGroupByBenefitCode[iRecordIndex].count =
          aBenefitGroupByBenefitCode[iRecordIndex].count + 1;
        aBenefitGroupByBenefitCode[iRecordIndex].amount =
          aBenefitGroupByBenefitCode[iRecordIndex].amount +
          oUnionBenefit.amount;
      } else {
        aBenefitGroupByBenefitCode.push({
          benefitCode: oUnionBenefit.benefitCode,
          amount: oUnionBenefit.amount,
          count: 1,
        });
      }
    }

    let aNewUnionBenefits = [];
    for (const oBenefitGroupByBenefitCode of aBenefitGroupByBenefitCode) {
      const iTargetAmount = this.roundTo2Decimal(
        Number(oBenefitGroupByBenefitCode.amount).toFixed(6)
      );
      let iTotalAmount = 0;
      let iCount = 0;
      for (let oUnionBenefit of aUnionBenefits) {
        if (
          oUnionBenefit.benefitCode === oBenefitGroupByBenefitCode.benefitCode
        ) {
          iCount = iCount + 1;
          if (iCount < oBenefitGroupByBenefitCode.count) {
            oUnionBenefit.amount = this.roundTo2Decimal(
              Number(oUnionBenefit.amount)
            );
            iTotalAmount =
              iTotalAmount + this.roundTo2Decimal(Number(oUnionBenefit.amount));
          } else {
            // last record
            oUnionBenefit.amount = this.roundTo2Decimal(
              Number(iTargetAmount - iTotalAmount)
            );
          }
          aNewUnionBenefits.push(oUnionBenefit);
        }
      }
    }
    return aNewUnionBenefits;
  }
  roundTo2Decimal(number) {
    if (number > 0) {
      return +(Math.round(number + "e+2") + "e-2");
    } else {
      return -(Math.round(Math.abs(number) + "e+2") + "e-2");
    }
  }
  getPayFrequencyMap() {
    return {
      "1POM": 1,
      "2POM": 2,
      "3POM": 3,
      "4POM": 4,
      LPOM: "LAST",
    };
  }
  checkMonthlyBenefit(
    benefit,
    payPeriodInfo,
    payFrequencyMap,
    benefitCumulation
  ) {
    let skipMonthlyBenefit = false;
    if (!benefit.paymentModel) {
      return false;
    }
    const payFrequency = payFrequencyMap[benefit.paymentModel];
    if (payFrequency == "LAST") {
      if (payPeriodInfo.isLastPeriodOfMonth != "Y") {
        skipMonthlyBenefit = true;
      }
    } else {
      if (payPeriodInfo.periodNumberOfMonth < payFrequency) {
        skipMonthlyBenefit = true;
      } else if (payPeriodInfo.periodNumberOfMonth > payFrequency) {
        if (
          this.monthlyBenefitHasBeenCalculated(
            payPeriodInfo.payDate,
            benefitCumulation,
            benefit.benefitCode
          )
        ) {
          skipMonthlyBenefit = true;
        }
      }
    }
    return skipMonthlyBenefit;
  }
  monthlyBenefitHasBeenCalculated(payDate, benefitCumulations, benefitCode){
    if ((payDate || '').length > 8 && benefitCumulations != undefined) {
      // const payYear = payDate.substring(0, 4)
      // const payMonth = payDate.substring(6,8)
      for (const benefitCumulation of benefitCumulations) {
        if (benefitCumulation.type == 'M' &&
            benefitCumulation.benefitCode == benefitCode && 
            benefitCumulation.beginDate <= payDate && 
            benefitCumulation.endDate >= payDate 
           ) {
          return true
        }
      }
    }
    return false
  }
}
module.exports = CalculateBenefitService;