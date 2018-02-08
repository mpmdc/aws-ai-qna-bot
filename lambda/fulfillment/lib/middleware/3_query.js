var aws=require('../aws')
var lambda= new aws.Lambda()
var _=require('lodash')

module.exports=function(req,res){
    var arn=_.get(req,"session.queryLambda",process.env.LAMBDA_DEFAULT_QUERY)
    console.log("Lambda query:",JSON.stringify({
        req,
        res
    },null,2))
    console.log("QueryLambda",arn)
    return lambda.invoke({
        FunctionName:arn,
        InvocationType:"RequestResponse",
        Payload:JSON.stringify({req,res})
    }).promise()
    .then(result=>{
        var parsed=JSON.parse(result.Payload)
        req=parsed.req
        res=parsed.res
        console.log("Query Response",JSON.stringify(req),JSON.stringify(res))
    })
}
