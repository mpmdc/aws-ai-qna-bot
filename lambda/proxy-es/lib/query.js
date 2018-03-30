//start connection
var Promise=require('bluebird')
var bodybuilder = require('bodybuilder')
var aws=require('aws-sdk')
var url=require('url')
var _=require('lodash')
var myCredentials = new aws.EnvironmentCredentials('AWS'); 
var request=require('./request')

module.exports=function(req,res){
    console.log(req,res)
    var query=bodybuilder()
    .orQuery('nested',{
        path:'questions',
        score_mode:'sum',
        boost:2},
        q=>q.query('match','questions.q',req.question)
    )
    .orQuery('match','a',req.question)
    .orQuery('match','t',_.get(req,'session.topic',''))
    .from(0)
    .size(1)
    .build()

    console.log("ElasticSearch Query",JSON.stringify(query,null,2))
    return request({
        url:`https://${req._info.es.address}/${req._info.es.index}/${req._info.es.type}/_search?search_type=dfs_query_then_fetch`,
        method:"GET",
        body:query
    })
    .then(function(result){
        console.log("ES result:"+JSON.stringify(result,null,2))
        res.result=_.get(result,"hits.hits[0]._source")
        if(res.result){ 
            res.type="PlainText"
            console.log(res.message)
            res.message=res.result.a
            var card=_.get(res,"result.r.title") ? res.result.r : null
            
            if(card){
                res.card.send=true
                res.card.title=_.get(card,'title')
                res.card.imageUrl=_.get(card,'imageUrl')
            }

            res.session.topic=_.get(res.result,"t")
            var previousJson = _.get(res.session,"previous",false)
            if(previousJson){
                previousJson= JSON.parse(res.session.previous)
            }
            var previousArray = _.get(previousJson,"previous",[])
            var hasPreviousQid = _.get(previousJson,"qid",false)
            // Only push the previous Document qid onto the stack if there is one and if it's not the same Document that was just called and its a qna type document
            if(hasPreviousQid && hasPreviousQid != _.get(res.result,"qid") && req._info.es.type=='qna'){
                previousArray.push(hasPreviousQid)
            }
            if(previousArray.length > 10){
                previousArray.shift()
            }

            if(_.has(res.result, "next")){
                res.session.previous={    
                    qid:_.get(res.result,"qid"),
                    a:_.get(res.result,"a"),
                    q:req.question,
                    next:_.get(res.result,"next",_.get(previousJson,"next","")),
                    previous:previousArray
                }
            }
        }else{
            res.type="PlainText"
            res.message=process.env.EMPTYMESSAGE
        }
        console.log("RESULT",JSON.stringify(req),JSON.stringify(res))
    })
}