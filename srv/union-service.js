const cds = require('@sap/cds')

module.exports = function(){
    this.after('READ', 'Unions', each => {
      console.log(each.customerID)
      console.log(each.code)
    });
    
    this.on('userInfo', req => {
      let results = {};
      results.user = req.user.id;
      if (req.user.hasOwnProperty('locale')) {
          results.locale = req.user.locale;
      }
      results.scopes = {};
      results.scopes.identified = req.user.is('identified-user');
      results.scopes.authenticated = req.user.is('authenticated-user');
      results.scopes.Viewer = req.user.is('Viewer');
      results.scopes.Admin = req.user.is('Admin');
      results.tenant = req.user.tenant;
      results.scopes.ExtendCDS = req.user.is('ExtendCDS');
      results.scopes.ExtendCDSdelete = req.user.is('ExtendCDSdelete');
      return results;
    })

}