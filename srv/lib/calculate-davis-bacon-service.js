const cds = require("@sap/cds");
var log = require("cf-nodejs-logging-support");

module.exports = function () {
    const { ConstantParameter, DavisBacon } = cds.entities;

    this.on("calculateDavisBacon", async (req) => {
        const tx = cds.tx(req);
        // const { ConstantParameter } = cds.entities;
        const us = await cds.connect.to('UnionService');
        // const logSwitch = await us.read(SELECT.from(ConstantParameter));
        const logSwitch = await us.read(SELECT.one`value`.from(ConstantParameter).where`parameter = 'LOG'`);

        if (!logSwitch && logSwitch != null && logSwitch.value == 'ON') {
            log.setLoggingLevel("info");
            log.registerCustomFields(["request_body", "response_body"]);
        }
        let davisBacons = [];
        const { davisBaconParameters } = req.data;
        if (!logSwitch && logSwitch != null && logSwitch.value == "ON") {
            log.info("request body", { request_body: davisBaconParameters });
        }
        const customerInfo = davisBaconParameters.customerInfo;
        const calculationBase = davisBaconParameters.calculationBase;
        const { passValidation, returnMessage } = validCustomerInfo(customerInfo);
        if (passValidation == false) {
            return req.reply(returnMessage);
        }
        // const { DavisBacon } = db.entities("com.reachnett.union");
        // const { DavisBacon } = cds.entities;
        for (const davisBaconParameter of calculationBase) {
            const { employeeNumber, davisBaconParametersByEmployee } =
                davisBaconParameter;
            let davisBacon = { employeeNumber: employeeNumber };
            davisBacon["davisBaconResults"] = await buildDavisBaconResults(
                customerInfo,
                davisBaconParametersByEmployee,
                DavisBacon
            );
            davisBacons.push(davisBacon);
        }
        if (!logSwitch && logSwitch != null && logSwitch.value == 'ON') {
            log.info("response body", { response_body: davisBacons });
        }
        return req.reply({ davisBacons: davisBacons });
    })

    function validCustomerInfo(customerInfo) {
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

    function validateInputData(hoursBase) {
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
    function getTotalHours(hoursBase) {
        let totalHours = 0;
        hoursBase.forEach((hourBase) => {
            if (hourBase.addToTotalHours == true) {
                totalHours = totalHours + parseFloat(hourBase.hours);
            }

        });
        return totalHours;
    }

    function getTotalEmployerPay(employerBenefitBase) {
        let totalEmployerPay = 0;
        employerBenefitBase.forEach((employerBenefit) => {
            totalEmployerPay = totalEmployerPay + parseFloat(employerBenefit.amount);
        });
        return totalEmployerPay;
    }

    async function buildDavisBaconRecord(hourBase, employerPayRate, customerInfo, DavisBacon) {
        let totalPayRate = 0;
        if (parseFloat(hourBase.percentage) > 100) {
            totalPayRate =
                (parseFloat(hourBase.rate) * 100) / parseFloat(hourBase.percentage);
        } else {
            totalPayRate = parseFloat(hourBase.rate);
        }
        totalPayRate = totalPayRate + employerPayRate;
        const davisBaconElement = await readDavisBaconRate(
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
                addToTotalHours: hourBase.addToTotalHours,
                isDavisBaconEligible: hourBase.isDavisBaconEligible,
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
    async function readDavisBaconRate(customerInfo, hourBase, DavisBacon) {
        if (hourBase.projectID == undefined) return
        // const projectID = hourBase.projectID != undefined ? hourBase.projectID : '*'
        const workdate = new Date(hourBase.workdate).toISOString();
        const davisBaconRate =
            await SELECT.one`combinedRate as davisBaconRate`.from(DavisBacon)
                .where`customerID = ${customerInfo.customerID} and
                                                unionCode = ${hourBase.globalUnionCode} and
                                                unionCraft = ${hourBase.globalCraftCode} and
                                                unionClass = ${hourBase.globalClassCode} and 
                                                projectID = ${hourBase.projectID} and
                                                validFrom <= ${workdate} and
                                                validTo >= ${workdate} 
                                            `;
        return davisBaconRate;
    }

    async function buildDavisBaconResults(customerInfo, davisBaconParametersByEmployee, DavisBacon) {
        let davisBaconResults = [];
        for (const davisBaconParameterByEmployee of davisBaconParametersByEmployee) {
            let { payPeriodInfo, hoursBase, employerBenefitBase } =
                davisBaconParameterByEmployee;
            let { passValidation, returnMessage } = validateInputData(hoursBase);
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
            let totalHours = getTotalHours(hoursBase);
            let totalEmployerPay = getTotalEmployerPay(employerBenefitBase);
            let employerPayRate = totalEmployerPay / totalHours;
            let davisBaconRecords = await buildDavisBaconRecords(
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

    async function buildDavisBaconRecords(hoursBase, employerPayRate, customerInfo, DavisBacon) {
        let davisBaconRecords = [];
        for (const hourBase of hoursBase) {
            if (hourBase.isDavisBaconEligible == false) {
                continue;
            }
            const davisBaconRecord = await buildDavisBaconRecord(
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