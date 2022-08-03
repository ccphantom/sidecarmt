/* type UnionBenefit {
    message             : String(10);
    unionBenefit        : array of {
        customerID      : String(10);
        workdate        : Date;
        benefitCode     : String(8);
        hours           : Decimal;
        rate            : Decimal;
        amount          : Decimal;
        globalUnionCode : String(8);
        globalClassCode : String(8);
        globalCraftCode : String(8);
        projectID       : String(24);
        sapALZNR        : String(4);
        sapC1ZNR        : String(4);
        sapABART        : String(4);
        sapAPZNR        : String(4);
        sapUNPTR        : String(8);
        sapTRFGR        : String(8);
        sapTRFST        : String(8);
        sapPOSNR        : String(8)
    }
} */

type UnionBenefit {
    customerID      : String(10);
    workdate        : Date;
    benefitCode     : String(8);
    hours           : Decimal;
    rate            : Decimal;
    calcMethod      : String(1);
    amount          : Decimal;
    globalUnionCode : String(8);
    globalClassCode : String(8);
    globalCraftCode : String(8);
    projectID       : String(24);
    sapALZNR        : String(4);
    sapC1ZNR        : String(4);
    sapABART        : String(4);
    sapAPZNR        : String(4);
    sapUNPTR        : String(8);
    sapTRFGR        : String(8);
    sapTRFST        : String(8);
    sapPOSNR        : String(8)
}

type BenefitBase : {
    workdate         : Date;
    earnCode         : String(8);
    hours            : Decimal;
    rate             : Decimal;
    amount           : Decimal;
    baseCode         : String(8);
    isProductiveTime : Boolean;
    isRegularTime    : Boolean;
    isOvertime       : Boolean;
    isDoubletime     : Boolean;
    globalUnionCode  : String(8);
    globalClassCode  : String(8);
    globalCraftCode  : String(8);
    projectID        : String(24);
    sapALZNR         : String(4);
    sapC1ZNR         : String(4);
    sapABART         : String(4);
    sapAPZNR         : String(4);
    sapUNPTR         : String(8);
    sapTRFGR         : String(8);
    sapTRFST         : String(8);
    sapPOSNR         : String(8)
}

type HourBase : BenefitBase {
    addToTotalHours: Boolean;
    isDavisBaconEligible: Boolean;
    percentage : Decimal;
};

type BenefitOverride : {
    customerID        : String(10);
    unionInfoPointer  : String(8);
    benefitCode       : String(4);
    projectID         : String(24);
    endDate           : Date;
    beginDate         : Date;
    benefitDescrition : String(40);
    benefitRate       : Decimal;
    calcMethod        : String(1);
    baseBucket        : String(4);
    paymentModel      : String(8);
    unionCode         : String(8);
    unionCraft        : String(8);
    unionClass        : String(8)
}

type BenefitCumulation : {
    benefitCode           : String(8);
    type                  : String(1);
    hours                 : Decimal(13, 3);
    amount                : Decimal(13, 2);
    currency              : String(5);
    internalNumber        : String(2);
    isFirstPeriodOfMonth  : Boolean;
    isSecondPeriodOfMonth : Boolean;
    isLastPeriodOfMonth   : Boolean;
    year                  : String(4);
    beginDate             : Date;
    endDate               : Date
}

type CustomerInfo : {
    customerID   : String(10);
    customerName : String(80);
}

type EmployerBenefitBase : {
    workdate        : Date;
    earnCode        : String(8);
    hours           : Decimal;
    rate            : Decimal;
    amount          : Decimal;
    baseCode        : String(8);
    globalUnionCode : String(8);
    globalClassCode : String(8);
    globalCraftCode : String(8);
    projectID       : String(24);
    sapALZNR        : String(4);
    sapC1ZNR        : String(4);
    sapABART        : String(4);
    sapAPZNR        : String(4);
    sapUNPTR        : String(8);
    sapTRFGR        : String(8);
    sapTRFST        : String(8);
    sapPOSNR        : String(8)
}

type Message : {
    messageType : String(10);
    message: String(200)
};

type PeriodInfo : {
    sequenceNumber      : String(5);
    payDate             : Date;
    periodNumberOfMonth : String(1);
    isLastPeriodOfMonth : String(1)
};