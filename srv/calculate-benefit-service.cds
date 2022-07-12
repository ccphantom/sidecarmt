using {
    BenefitBase,
    BenefitOverride,
    BenefitCumulation,
    CustomerInfo,
    UnionBenefit,
    Message,
    PeriodInfo
} from '../custom/custom-type';

type UnionBenefitParameter : {
    customerInfo                         : CustomerInfo;
    calculationBase                      : array of {
        employeeNumber                   : String(8);
        unionBenefitParametersByEmployee : array of {
            payPeriodInfo                : PeriodInfo;
            benefitBase                  : array of BenefitBase;
            benefitOverride              : array of BenefitOverride;
            benefitCumulation            : array of BenefitCumulation;
        };
    }
}

type UnionBenefitReturn : {
    employeeNumber         : String(8);
    unionBenefitResults    : array of {
        message            : Message;
        payPeriodInfo      : PeriodInfo;
        unionBenefitResult : array of UnionBenefit
    }
}

service CalculateBenefitService @(impl : './lib/calculate-benefit-service.js') {

    action calculateBenefit(unionBenefitParameters : UnionBenefitParameter) returns {
        unionBenefits : array of UnionBenefitReturn
    };
}
