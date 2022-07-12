namespace com.reachnett.union;

using {
    managed,
    temporal,
    cuid
} from '@sap/cds/common';

entity Unions : managed, temporal, cuid {
    customerID  : String(10) not null;
    code        : String(5) not null;
    unionRef    : String(10);
    unionNumber : String(4);
    region      : String(40);
    shortText   : String(40);
    longText    : String(80)
}

entity Crafts : managed, temporal, cuid {
    customerID : String(10) not null;
    code       : String(5) not null;
    craftRef   : String(10);
    shortText  : String(40);
    longText   : String(80)
}

entity Classes : managed, temporal, cuid {
    customerID : String(10) not null;
    code       : String(5) not null;
    classRef   : String(10);
    shortText  : String(40);
    longText   : String(80)
}

entity UnionRates : managed, temporal, cuid {
    customerID       : String(10);
    unionInfoPointer : String(8);
    unionCode        : String(4);
    unionCraft       : String(2);
    unionClass       : String(4);
    projectID        : String(24);
    regularRate      : Decimal(13, 3);
    overtimeRate     : Decimal(13, 3);
    doubleTimeRate   : Decimal(13, 3)
}

entity UnionFringes : managed, temporal, cuid {
    customerID        : String(10);
    unionInfoPointer  : String(8);
    unionCode         : String(4);
    unionCraft        : String(2);
    unionClass        : String(4);
    projectID         : String(24);
    benefitOption     : String(4);
    unionFringe       : String(4);
    fringeDescription : String(40);
    fringeRate        : Decimal(10, 5);
    calculationMethod : String(1);
    baseCode          : String(4);
    vendor            : String(10);
    paymentModel      : String(4)
}

entity DavisBacon : managed, temporal, cuid {
    customerID       : String(10);
    unionInfoPointer : String(8);
    unionCode        : String(4);
    unionCraft       : String(2);
    unionClass       : String(4);
    projectID        : String(24);
    basicRate        : Decimal(10, 5);
    combinedRate     : Decimal(10, 5)
}

entity ConstantParameter : managed, temporal, cuid {
    parameter : String(20);
    value : String(20)
}
