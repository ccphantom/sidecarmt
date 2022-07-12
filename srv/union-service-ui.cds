using UnionService from './union-service';

annotate UnionService.Unions with {
    customerID @title : 'Customer ID';
    code       @title : 'Code';
    shortText  @title : 'Short Text';
    longText   @title : 'Long Text';
    validFrom  @title : 'Valid From';
    validTo    @title : 'Valid To';
}

annotate UnionService.Unions with @(
    Capabilities.NavigationRestrictions : {
        RestrictedProperties : [
            {
                InsertRestrictions: {
                    Insertable : true
                },
                DeleteRestrictions : {
                    Deletable : true
                }
            }

        ]
    },
    Capabilities.InsertRestrictions : {
        Insertable : true
    },
    UI:{
        HeaderInfo : {
            $Type : 'UI.HeaderInfoType',
            TypeName : 'Union',
            TypeNamePlural : 'Unions',
        },
        LineItem : [
            {Value: customerID},
            {Value: code},
            {Value: shortText},
            {Value: longText},
            {Value: validFrom},
            {Value: validTo}
        ],
    }
);

