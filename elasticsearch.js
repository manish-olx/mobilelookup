var elasticsearch = require('elasticsearch');
var utills = require(__dirname+'/utills');
var config = require(__dirname+'/src/bin/config');

var elasticClient = new elasticsearch.Client({
    host: 'localhost:9200',
    log: 'info'
});

var indexName = "olxin";

/**
 * Delete an existing index
 */
function deleteIndex() {
    return elasticClient.indices.delete({
        index: indexName
    });
}
exports.deleteIndex = deleteIndex;

/**
 * create the index
 */
function initIndex() {
    return elasticClient.indices.create({
        index: indexName
    });
}
exports.initIndex = initIndex;

/**
 * check if the index exists
 */
function indexExists() {
    return elasticClient.indices.exists({
        index: indexName
    });
}
exports.indexExists = indexExists;

function initMapping() {
    return elasticClient.indices.putMapping({
        index: indexName,
        type: "mobile",
        body: {
            properties: {
                brand: { type: "string" },
                model: {
                    type: "nested",
                    name: {
                        type: "string",
                        analyzer: "whitespace"
                    },
                    number: {
                        type: "string",
                        analyzer: "whitespace"
                    }
                },
                display: {
                    type: "nested",
                    width: { type: "string" },
                    height: { type: "string" },
                    size: { type: "string" }
                },
                ram: { type: "string" },
                cpu: {
                    type: "nested",
                    chipset: { type: "string" }
                },
                os: {
                    type: "nested",
                    version: { type: "string" },
                    is_rooted: { type: "string" }
                },
                storage: {
                    type: "nested",
                    internal: { type: "string" },
                    external: { type: "string" }
                },
                dual_sim: { type: "string" },
                device: { type: "string" },
                camera: {
                    type: "nested",
                    primary:{
                        type: "string"
                    },
                    front:{
                        type: "string"
                    }
                },
                created_at: { type: "date", format: "yyyy-MM-dd HH:mm:ss" },
                modified_at: { type: "date", format: "yyyy-MM-dd HH:mm:ss" },
                suggest: {
                    type: "completion",
                    analyzer: "simple",
                    search_analyzer: "simple",
                    max_input_length: 20,
                    preserve_separators: true,
                    payloads: true
                }
            }
        }
    });
}
exports.initMapping = initMapping;

function addDocument(document) {
    var datetime = new Date();
    var currentDate = utills.convertDate(datetime);

    return elasticClient.index({
        index: indexName,
        type: "mobile",
        body: {
            brand: document.brand,
            model: document.model,
            display: document.display,
            ram: document.ram,
            cpu: document.cpu,
            os: document.os,
            storage: document.storage,
            dual_sim: document.dual_sim,
            device: document.device,
            camera: document.camera,
            created_at: currentDate,
            modified_at: currentDate,
            suggest: {
                input: [document.model.number, document.model.name],
                output: document.model.name,
                payload: document.model.number || {}
            }
        }
    });
}
exports.addDocument = addDocument;

function getData(input) {
    return elasticClient.search({
        index: indexName,
        type: "mobile_final",
        body: {
            query: {
                "nested" : {
                    "path" : "model",
                    "score_mode" : "avg",
                    "query" : {
                        "bool" : {
                            "should" : [
                                { "match" : {"name" : input} },
                                { "match" : {"number" : input} }
                            ]
                        }
                    }
                }
            }
        }
   })
}
exports.getData = getData;

function getSuggestions(input) {
    return elasticClient.suggest({
        index: indexName,
        type: "mobile_final",
        body: {
            suggestions: {
                text: input,
                completion: {
                    field: "suggest",
                    fuzzy: true
                }
            }
        }
    })
}
exports.getSuggestions = getSuggestions;

function getRawData(offset) {

    /*var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    yesterdayDate = utills.convertDate(yesterday);
    console.log("aaaaaa:: "+ yesterdayDate);*/
    return elasticClient.search({
        index: indexName,
        type: "mobile",
        body: {
            "size" : config.data_process_chunk_limit,
            query: {
                "filtered": {
                    "query": {
                        "match_all": {}
                    },
                    "filter": {
                        "range" : {
                            "created_at" : {
                                "gte" : "2017-04-04 00:00:00",
                                "lte":"2017-04-04 23:59:59"
                            }
                        }
                    }
                }
            }
        }
    });
}
exports.getRawData = getRawData;

function initModelMapping() {
    return elasticClient.indices.putMapping({
        index: indexName,
        type: "mapping_android",
        body: {
            properties: {
                manufacturer: { type: "string", analyzer: "standard" },
                model_name: { type: "string" },
                model_number: { type: "string", analyzer: "standard" },
                device: { type: "string", analyzer: "standard" }
            }
        }
    });
}
exports.initModelMapping = initModelMapping;

function isModelMappingExists() {
    return elasticClient.indices.existsType({
        index: indexName,
        type: "mapping_android"
    });
}
exports.isModelMappingExists = isModelMappingExists;


function addModelMappingDocument(document) {
    return elasticClient.index({
        index: indexName,
        type: "mapping_android",
        body: {
            manufacturer: document.manufacturer,
            model_name: document.model_name,
            model_number: document.model_number,
            device: document.device
        }
    });
}
exports.addModelMappingDocument = addModelMappingDocument;

function insertCsvData(csvData) {
    var lines = csvData.toString().split('\n');
    console.log("Line lenght:: "+lines.length);
    for (var i = 0; i < lines.length; i++) {

        var dataRow = lines[i].toString('utf8').split(',');
        var mobileMappingDocument = "{'manufacturer':"+dataRow[2]+",'model_name':"+dataRow[1]+",'model_number':"+dataRow[3]+",'device':"+dataRow[2]+"}";

        this.addModelMappingDocument(mobileMappingDocument).then(function (result) {
        })
        console.log("Line "+i+" Data1:: "+ mobileMappingDocument);
    }

    return 1;
}
exports.insertCsvData = insertCsvData;

function isFinalMobileDocumentExists() {
    return elasticClient.indices.existsType({
        index: indexName,
        type: "mobile_final"
    });
}
exports.isFinalMobileDocumentExists = isFinalMobileDocumentExists;

function initFinalMobileDocument() {
    return elasticClient.indices.putMapping({
        index: indexName,
        type: "mobile_final",
        body: {
            properties: {
                brand: { type: "string" },
                model: {
                    type: "nested",
                    name: {
                        type: "string",
                        analyzer: "whitespace"
                    },
                    number: {
                        type: "string",
                        analyzer: "whitespace"
                    }
                },
                display: {
                    type: "nested",
                    width: { type: "string" },
                    height: { type: "string" },
                    size: { type: "string" }
                },
                ram: { type: "string" },
                cpu: {
                    type: "nested",
                    chipset: { type: "string" }
                },
                os: {
                    type: "nested",
                    version: { type: "string" },
                    is_rooted: { type: "string" }
                },
                storage: {
                    type: "nested",
                    internal: { type: "string" },
                    external: { type: "string" }
                },
                dual_sim: { type: "string" },
                device: { type: "string" },
                camera: {
                    type: "nested",
                    primary:{
                        type: "string"
                    },
                    front:{
                        type: "string"
                    }
                },
                created_at: { type: "date", format: "yyyy-MM-dd HH:mm:ss" },
                modified_at: { type: "date", format: "yyyy-MM-dd HH:mm:ss" },
                suggest: {
                    type: "completion",
                    analyzer: "simple",
                    search_analyzer: "simple",
                    max_input_length: 20,
                    preserve_separators: true,
                    payloads: true
                }
            }
        }
    });
}
exports.initFinalMobileDocument = initFinalMobileDocument;

function isModelExistsInFinalDb(document) {
    return elasticClient.search({
        index: indexName,
        type: "mobile_final",
        body: {
            query: {
                "bool" :{
                    "must" : [
                        { "match": {"brand": document.brand} },
                        { "match": {"device": document.device} },
                        {
                            "nested" : {
                                "path" : "model",
                                "query" : {
                                    "bool" : {
                                        "must" : {
                                            "match" : {"number" : document.model.number}
                                        }
                                    }
                                }
                            }
                        }
                    ]
                }
            }
        }
    });
}
exports.isModelExistsInFinalDb = isModelExistsInFinalDb;

function addDocumentToFinalDb(document) {
    var datetime = new Date();
    var currentDate = utills.convertDate(datetime);

    return elasticClient.index({
        index: indexName,
        type: "mobile_final",
        body: {
            brand: document.brand,
            model: document.model,
            display: document.display,
            ram: document.ram,
            cpu: document.cpu,
            os: document.os,
            storage: document.storage,
            dual_sim: document.dual_sim,
            device: document.device,
            camera: document.camera,
            created_at: currentDate,
            modified_at: currentDate,
            suggest: {
                input: [document.model.number, document.model.name],
                output: document.model.name,
                payload: document.model.number || {}
            }
        }
    });
}
exports.addDocumentToFinalDb = addDocumentToFinalDb;

function updateDocumentFinalDb(document, id) {
    var datetime = new Date();
    var currentDate = utills.convertDate(datetime);

    return elasticClient.update({
        index: indexName,
        type: "mobile_final",
        id: id,
        body: {
            doc: {
                brand: document.brand,
                model: document.model,
                display: document.display,
                ram: document.ram,
                cpu: document.cpu,
                os: document.os,
                storage: document.storage,
                dual_sim: document.dual_sim,
                device: document.device,
                camera: document.camera,
                modified_at: currentDate
            }
        }
    });
}
exports.updateDocumentFinalDb = updateDocumentFinalDb;

function getModelNameFromMapping(document) {
    return elasticClient.search({
        index: indexName,
        type: "mapping_android",
        body: {
            fields: ["model_name"],
            query: {
                "bool" :{
                    "must" : [
                        { "match": {"manufacturer": document.brand} },
                        { "match": {"device": document.device} },
                        { "match": {"model_number": document.model.number} }
                    ]
                }
            }
        }
    });
}
exports.getModelNameFromMapping = getModelNameFromMapping;
