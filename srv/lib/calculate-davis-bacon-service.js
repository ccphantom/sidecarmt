const cds = require("@sap/cds");
var log = require("cf-nodejs-logging-support");

class CalculateDavisBaconService extends cds.ApplicationService {
  async init() {
    this.on("calculateDavisBacon", this.calculateDavisBacon);
    await super.init();
  }

  async calculateDavisBacon(req) {
    const db = await cds.connect.to("db");
    const { ConstantParameter } = db.entities("com.reachnett.union");
    const logSwitch = await SELECT.one`value`.from(ConstantParameter).where`parameter = 'LOG'`;
    if (logSwitch.value == 'ON') {
        log.setLoggingLevel("info");
        log.registerCustomFields(["request_body", "response_body"]);  
    }
    let davisBacons = [];
    const { davisBaconParameters } = req.data;
    if (logSwitch.value == "ON") {
      log.info("request body", { request_body: davisBaconParameters });
    }
    const customerInfo = davisBaconParameters.customerInfo;
    const calculationBase = davisBaconParameters.calculationBase;
    const { passValidation, returnMessage } = this.validCustomerInfo(customerInfo);
    if (passValidation == false) {
      return req.reply(returnMessage);
    }
    const { DavisBacon } = db.entities("com.reachnett.union");
    for (const davisBaconParameter of calculationBase) {
      const { employeeNumber, davisBaconParametersByEmployee } =
        davisBaconParameter;
      let davisBacon = { employeeNumber: employeeNumber };
      davisBacon["davisBaconResults"] = await this.buildDavisBaconResults(
        customerInfo,
        davisBaconParametersByEmployee,
        DavisBacon
      );
      davisBacons.push(davisBacon);
    }
    if (logSwitch.value == 'ON') {
        log.info("response body", { response_body: davisBacons });
    }
    return req.reply({ davisBacons: davisBacons });
  }

  validCustomerInfo(customerInfo) {
    let passValidation = true;
    let returnMessage = "";
    if (customerInfo.length == 0) {
      passValidation = false;
      returnMessage = "Customer information is empty";
    }
    return {
      passValidation,
      returnMessage,
    };
  }

  validateInputData(hoursBase) {
    let passValidation = true;
    let returnMessage = "";
    if (hoursBase.length == 0) {
      passValidation = false;
      returnMessage = "Hour base table is empty";

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
  getTotalHours(hoursBase) {
    let totalHours = 0;
    hoursBase.forEach((hourBase) => {
      totalHours = totalHours + parseFloat(hourBase.hours);
    });
    return totalHours;
  }

  getTotalEmployerPay(employerBenefitBase) {
    let totalEmployerPay = 0;
    employerBenefitBase.forEach((employerBenefit) => {
      totalEmployerPay = totalEmployerPay + parseFloat(employerBenefit.amount);
    });
    return totalEmployerPay;
  }

  async buildDavisBaconRecord(hourBase, employerPayRate, customerInfo, DavisBacon) {
    let totalPayRate = 0;
    if (parseFloat(hourBase.percentage) > 100) {
      totalPayRate =
        (parseFloat(hourBase.rate) * 100) / parseFloat(hourBase.percentage);
    } else {
      totalPayRate = parseFloat(hourBase.rate);
    }
    totalPayRate = totalPayRate + employerPayRate;
    const davisBaconElement = await this.readDavisBaconRate(
      customerInfo,
      hourBase,
      DavisBacon
    );
    if (!davisBaconElement) {
      return {};
    }
    let davisBaconRate = davisBaconElement.davisBaconRate;
    if (davisBaconRate > totalPayRate) {
      let amountDifference = (davisBaconRate - totalPayRate) * hourBase.hours;
      let unionBenefit = {
        customerID: customerInfo.customerID,
        workdate: hourBase.workdate,
        benefitCode: "DBWT",
        hours: hourBase.hours,
        rate: "",
        amount: amountDifference,
        globalUnionCode: hourBase.globalUnionCode,
        globalClassCode: hourBase.globalClassCode,
        globalCraftCode: hourBase.globalCraftCode,
        projectID: hourBase.projectID,
        sapALZNR: hourBase.sapALZNR,
        sapC1ZNR: hourBase.sapC1ZNR,
        sapABART: hourBase.sapABART,
        sapAPZNR: hourBase.sapAPZNR,
        sapUNPTR: hourBase.sapUNPTR,
        sapTRFGR: hourBase.sapTRFGR,
        sapTRFST: hourBase.sapTRFST,
        sapPOSNR: hourBase.sapPOSNR,
      };
      return unionBenefit;
    }
    return {};
  }
  async readDavisBaconRate(customerInfo, hourBase, DavisBacon) {
    if (hourBase.projectID == undefined) return
    // const projectID = hourBase.projectID != undefined ? hourBase.projectID : '*'
    const workdate = new Date(hourBase.workdate).toISOString();
    const davisBaconRate =
      await SELECT.one`combinedRate as davisBaconRate`.from(DavisBacon)
        .where`customerID = ${customerInfo.customerID} and
                                            unionInfoPointer = ${hourBase.sapUNPTR} and
                                            projectID = ${hourBase.projectID} and
                                            validFrom <= ${workdate} and
                                            validTo >= ${workdate} 
                                        `;
    return davisBaconRate;
  }

  async buildDavisBaconResults(customerInfo, davisBaconParametersByEmployee, DavisBacon) {
    let davisBaconResults = [];
    for (const davisBaconParameterByEmployee of davisBaconParametersByEmployee) {
      let { payPeriodInfo, hoursBase, employerBenefitBase } =
        davisBaconParameterByEmployee;
      let { passValidation, returnMessage } = this.validateInputData(hoursBase);
      let davisBaconResult = {};
      if (passValidation == false) {
        davisBaconResult["message"] = returnMessage;
        davisBaconResults.push(davisBaconResult);
        continue;
      }
      davisBaconResult["payPeriodInfo"] = payPeriodInfo;
      if (employerBenefitBase == undefined) {
        employerBenefitBase = []
      }
      let totalHours = this.getTotalHours(hoursBase);
      let totalEmployerPay = this.getTotalEmployerPay(employerBenefitBase);
      let employerPayRate = totalEmployerPay / totalHours;
      let davisBaconRecords = await this.buildDavisBaconRecords(
        hoursBase,
        employerPayRate,
        customerInfo,
        DavisBacon
      );
      davisBaconResult["davisBaconResult"] = davisBaconRecords;
      davisBaconResult["message"] = "Calculated Successfully";
      davisBaconResults.push(davisBaconResult);
    }
    return davisBaconResults;
  }

  async buildDavisBaconRecords(hoursBase, employerPayRate, customerInfo, DavisBacon) {
    let davisBaconRecords = [];
    for (const hourBase of hoursBase) {
      const davisBaconRecord = await this.buildDavisBaconRecord(
        hourBase,
        employerPayRate,
        customerInfo,
        DavisBacon
      );
      if (Object.keys(davisBaconRecord).length != 0) {
        davisBaconRecords.push(davisBaconRecord);
      }
    }
    return davisBaconRecords;
  }
}
module.exports = CalculateDavisBaconService;