var config = require('../src/bin/config');
var elastic = require('../elasticsearch');
var fs = require('fs');

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
    app.post('/mobiles/initmapping', function(req, res, next) {
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

        if(typeof req.body.model != 'undefined' && typeof req.body.model.number!= 'undefined'
            && req.body.model.number.trim()!=''
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

        var configData = {};

        elastic.isFinalMobileDocumentExists().then(function (documentExists) {

            if(!documentExists) {
                // If final Db document doesn't exists ten create it
                elastic.initFinalMobileDocument();
            }

            elastic.getRawData(configData).then(function (resultRaw) {

                if(resultRaw.hits.hits.length > 0)
                {
                    for(var i=0;i<resultRaw.hits.hits.length;i++) {

                        // check if exists in final DB
                        elastic.isModelExistsInFinalDb(resultRaw.hits.hits[i]._source).then(function (resultFinal) {

                            console.log("Find in final DB:: "+JSON.stringify(resultFinal));

                            elastic.getModelNameFromMapping(resultRaw.hits.hits[this.i]._source).then(function (resultMapping) {

                                if(resultFinal.hits.total > 0) {

                                    var updateRequired = false;
                                    var diffRawData = {};
                                    diffRawData.model = {};
                                    diffRawData.display = {};
                                    diffRawData.cpu = {};
                                    diffRawData.os = {};
                                    diffRawData.storage = {};
                                    diffRawData.camera = {};

                                    console.log("Iterator:: "+ this.i);
                                    console.log("Raw Data");
                                    console.log(JSON.stringify(resultRaw.hits));
                                    console.log("Data exists in Final Db");
                                    console.log(JSON.stringify(resultFinal.hits.hits[0]));

                                    var rowId = resultFinal.hits.hits[0]._id;

                                    if(typeof resultRaw.hits.hits[this.i]._source.brand !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.brand!=resultFinal.hits.hits[0]._source.brand) {
                                        diffRawData.brand = resultRaw.hits.hits[this.i]._source.brand;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.model.name !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.model.name !== ''
                                        && resultRaw.hits.hits[this.i]._source.model.name!=resultFinal.hits.hits[0]._source.model.name) {
                                        diffRawData.model.name = resultRaw.hits.hits[this.i]._source.model.name;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.model.number !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.model.number!=resultFinal.hits.hits[0]._source.model.number) {
                                        diffRawData.model.number = resultRaw.hits.hits[this.i]._source.model.number;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.display.width !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.display.width!=resultFinal.hits.hits[0]._source.display.width) {
                                        diffRawData.display.width = resultRaw.hits.hits[this.i]._source.display.width;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.display.height !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.display.height!=resultFinal.hits.hits[0]._source.display.height) {
                                        diffRawData.display.height = resultRaw.hits.hits[this.i]._source.display.height;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.display.size !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.display.size!=resultFinal.hits.hits[0]._source.display.size) {
                                        diffRawData.display.size = resultRaw.hits.hits[this.i]._source.display.size;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.ram !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.ram!=resultFinal.hits.hits[0]._source.ram) {
                                        diffRawData.ram = resultRaw.hits.hits[this.i]._source.ram;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.cpu.chipset !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.cpu.chipset!=resultFinal.hits.hits[0]._source.cpu.chipset) {
                                        diffRawData.cpu.chipset = resultRaw.hits.hits[this.i]._source.cpu.chipset;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.os.version !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.os.version!=resultFinal.hits.hits[0]._source.os.version) {
                                        diffRawData.os.version = resultRaw.hits.hits[this.i]._source.os.version;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.os.is_rooted !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.os.is_rooted!=resultFinal.hits.hits[0]._source.os.is_rooted) {
                                        diffRawData.os.is_rooted = resultRaw.hits.hits[this.i]._source.os.is_rooted;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.storage.internal !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.storage.internal!=resultFinal.hits.hits[0]._source.storage.internal) {
                                        diffRawData.storage.internal = resultRaw.hits.hits[this.i]._source.storage.internal;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.storage.external !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.storage.external!=resultFinal.hits.hits[0]._source.storage.external) {
                                        diffRawData.storage.external = resultRaw.hits.hits[this.i]._source.storage.external;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.dual_sim !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.dual_sim!=resultFinal.hits.hits[0]._source.dual_sim) {
                                        diffRawData.dual_sim = resultRaw.hits.hits[this.i]._source.dual_sim;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.device !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.device!=resultFinal.hits.hits[0]._source.device) {
                                        diffRawData.device = resultRaw.hits.hits[this.i]._source.device;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.camera.primary !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.camera.primary!=resultFinal.hits.hits[0]._source.camera.primary) {
                                        diffRawData.camera.primary = resultRaw.hits.hits[this.i]._source.camera.primary;
                                        updateRequired = true;
                                    }
                                    if(typeof resultRaw.hits.hits[this.i]._source.camera.front !== 'undefined'
                                        && resultRaw.hits.hits[this.i]._source.camera.front!=resultFinal.hits.hits[0]._source.camera.front) {
                                        diffRawData.camera.front = resultRaw.hits.hits[this.i]._source.camera.front;
                                        updateRequired = true;
                                    }

                                    if(updateRequired === true) {
                                        console.log("Inside if");
                                        elastic.updateDocumentFinalDb(diffRawData, rowId);
                                    }

                                } else {

                                    console.log("Data Not exists in Final DB");
                                    resultRaw.hits.hits[this.i]._source.model.name = resultMapping.hits.hits[0].fields.model_name.toString();
                                    elastic.addDocumentToFinalDb(resultRaw.hits.hits[this.i]._source);
                                }

                            }.bind({i: this.i}));
                        }.bind({i: i}));

                    }
                }
            });

            res.json({
             "data":{
             "status":"200",
             "title":"Data migrated successfully"
             },
             "error": {}
             });

        });


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
                res.json({
                    "data":{
                        "status":"200",
                        "title":"Data migrated successfully"
                    },
                    "error": {}
                })
            } else {
                res.json({
                    "data":{},
                    "error": {
                        "status":"200",
                        "title":"Document already exists"
                    }
                })
            }
        });
    });
};