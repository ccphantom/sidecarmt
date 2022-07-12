using {
    HourBase,
    CustomerInfo,
    UnionBenefit,
    EmployerBenefitBase
} from '../custom/custom-type';

type DavisBaconParameter : {
    customerInfo                       : CustomerInfo;
    calculationBase                    : array of {
        employeeNumber                 : String(8);
        davisBaconParametersByEmployee : array of {
            payPeriodInfo              : {
                sequenceNumber         : String(5);
                payDate                : Date
            };
            hoursBase                  : array of HourBase;
            employerBenefitBase        : array of EmployerBenefitBase;
        }
    };
}

type DavisBacon : {
    employeeNumber         : String(8);
    davisBaconResults      : array of {
        message            : String(50);
        payPeriodInfo      : {
            sequenceNumber : String(5);
            payDate : Date
        };
        davisBaconResult   : array of UnionBenefit
    }
}


service CalculateDavisBaconService @(impl : './lib/calculate-davis-bacon-service.js') {

    action calculateDavisBacon(davisBaconParameters : DavisBaconParameter) returns {
        davisBacons : array of DavisBacon
    };
}
