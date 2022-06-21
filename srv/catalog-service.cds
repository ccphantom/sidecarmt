using {sidecarmt.db as db} from '../db/data-model';

using {CV_SALES, CV_SESSION_INFO} from '../db/data-model';












service CatalogService @(path : '/catalog')
@(requires: 'authenticated-user')
{
    entity Sales
      @(restrict: [{ grant: ['READ'],
                     to: 'Viewer'
                   },
                   { grant: ['WRITE'],
                     to: 'Admin' 
                   }
                  ])
      as select * from db.Sales
      actions {
        @(restrict: [{ to: 'Admin' }])
        action boost() returns Sales;
      }
    ;


    @readonly
    entity VSales
      @(restrict: [{ to: 'Viewer' }])
      as select * from CV_SALES
    ;

    @readonly
    entity SessionInfo
      @(restrict: [{ to: 'Viewer' }])
      as select * from CV_SESSION_INFO
    ;

    function topSales
      @(restrict: [{ to: 'Viewer' }])
      (amount: Integer)
      returns many Sales;












    type userScopes { identified: Boolean; authenticated: Boolean; Viewer: Boolean; Admin: Boolean; ExtendCDS: Boolean; ExtendCDSdelete: Boolean;};
    type userType { user: String; locale: String; tenant: String; scopes: userScopes; };
    function userInfo() returns userType;


};