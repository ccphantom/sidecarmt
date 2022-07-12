// const cds = require('@sap/cds')

module.exports = function(){
    this.after('READ', 'Unions', each => {
      console.log(each.customerID)
      console.log(each.code)
    })
}