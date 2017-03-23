var config = require('../src/bin/config');
var elastic = require('../elasticsearch');
var fs = require('fs');
var utf8 = require('utf8');

module.exports = function(app) {
    app.get('/', function(req, res, next) {
        return res.send(config.title);
    });

    /** Create Index */
    app.get('/mobiles/createindex', function(req, res, next) {
        elastic.indexExists().then(function (exists) {
            if (!exists) {
                elastic.initIndex().then(function (result) {
                    res.json({
                        "data":result,
                        "error":{}
                    });
                });
            }
            else{
                res.json({
                    "data":{},
                    "error":{"status":"200","title": "Index already exists"}
                });
            }
        });
    });

    /** DELETE Index */
    app.post('/mobiles/deleteindex', function(req, res, next) {
        elastic.deleteIndex().then(function (result) {
            res.json({
                "data":result,
                "error":{}
            });
        });
    });

    /** Create Mapping */
    app.get('/mobiles/initmapping', function(req, res, next) {
        elastic.initMapping().then(function (result) {
            res.json({
                "data":result,
                "error":{}
            });
        });
    });

    /** GET mobile Data */
    app.get('/mobiles/getdata/:input', function(req, res, next) {
        elastic.getData(req.params.input).then(function (result) {
            if(result.hits.total > 0)
            {
                res.json({
                    "data":result.hits.hits[0]._source,
                    "error":{}
                });
            }
            else{
                res.json({
                    "data":{},
                    "error":{"status":"404","title": "Not Found"}
                });
            }
        });
    });

    /** GET All Data */
    app.get('/mobiles/getalldata/:input', function(req, res, next) {
        elastic.getAllData(req.params.input).then(function (result) {
            if(result.hits.total > 0)
            {
                res.json({
                    "data":result,
                    "error":{}
                });
            }
            else{
                res.json({
                    "data":{},
                    "error":{"status":"404","title": "Not Found"}
                });
            }
        });
    });

    /** POST document to be indexed */
    app.post('/mobiles/setdata', function(req, res, next) {

        if(typeof req.body.model != 'undefined' &&
            ((typeof req.body.model.name!= 'undefined' && req.body.model.name.trim()!='')
            || (typeof req.body.model.number!= 'undefined' && req.body.model.name.trim()!=''))
        ) {
            elastic.addDocument(req.body).then(function (result) {
                if(result.created==true)
                {
                    res.json({
                        "data": {
                            "status":"200",
                            "created": result.created
                        }
                    })
                } else {
                    res.json({
                        "data":{},
                        "error":{"status":"200","title": ""}
                    });
                }
            });
        } else {
            res.json({
                "data":{},
                "error":{"status":"200","title": "Model number/name doesn't exits"}
            });
        }
    });

    /** GET suggestions */
    app.get('/mobiles/suggest/:input', function(req, res, next) {
        elastic.getSuggestions(req.params.input).then(function (result) {
            if(result.suggestions[0].options.length > 0)
            {
                var suggestion = [];
                for(var i=0; i<result.suggestions[0].options.length;i++) {
                    if(result.suggestions[0].options[i].text.trim()!=null
                        && result.suggestions[0].options[i].text.trim()!=""){
                        suggestion.push(result.suggestions[0].options[i].text.trim());
                    } else {
                        suggestion.push(result.suggestions[0].options[i].payload.trim());
                    }
                }

                res.json({
                    "data": {"suggestions": suggestion},
                    "error": {}
                });
            } else {
                res.json({
                    "data":{},
                    "error":{"status":"404","title": "No suggestion found"}
                });
            }
        });
    });

    /** insert data into final db */
    app.get('/mobiles/migratedata/', function(req, res, next) {
        for(var iterator=0;iterator<100;) {
            console.log("Processing data for offset:: "+ iterator);
            elastic.getAllData(iterator).then(function (result) {
                //res.json(result);
            });
            iterator=iterator+config.data_chunk_limit;
            console.log("Processed data for offset:: "+ iterator);
        }
        res.json({
            "data":{
                "status":"200",
                "title":"Data migrated successfully"
            },
            "error": {}
        })

    });

    /** Import CSV mapping data*/
    app.get('/mobiles/modelmapping/import', function(req, res, next) {

        elastic.isModelMappingExists().then(function (exists) {
            if(!exists) {
                elastic.initModelMapping().then(function () {
                    fs.readFile(__dirname+'/../src/bin/supported_devices.csv', 'utf-8', function(err, contents) {

                        var lines = contents.toString().split('\n');
                        for (var i = 0; i < lines.length; i++) {

                            var dataRow = lines[i].toString().split(',');
                            elastic.addModelMappingDocument({manufacturer:dataRow[0],model_name:dataRow[1],model_number:dataRow[3],device:dataRow[2]}).then(function (result) {
                            });
                        }
                    });
                });
            }

            res.json({
                "data":{
                    "status":"200",
                    "title":"Data migrated successfully"
                },
                "error": {}
            })
        });
    });
};