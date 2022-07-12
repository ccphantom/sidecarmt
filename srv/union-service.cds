using { com.reachnett.union as union } from '../db/schema';
@path: '/service'
service UnionService {
    entity Unions as projection on union.Unions;
    entity Crafts as projection on union.Crafts;
    entity Classes as projection on union.Classes;
    entity UnionRates as projection on union.UnionRates;
    entity UnionFringes as projection on union.UnionFringes;
    entity DavisBacon as projection on union.DavisBacon;

    type userScopes { identified: Boolean; authenticated: Boolean; Viewer: Boolean; Admin: Boolean; ExtendCDS: Boolean; ExtendCDSdelete: Boolean;};
    type userType { user: String; locale: String; tenant: String; scopes: userScopes; };
    function userInfo() returns userType;
}