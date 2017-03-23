var elasticsearch = require('elasticsearch');

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
                        analyzer: "standard"
                    },
                    number: {
                        type: "string",
                        analyzer: "standard"
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
                suggest: {
                    type: "completion",
                    analyzer: "standard",
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
        type: "mobile",
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
        type: "mobile",
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

function getAllData(input) {
    return elasticClient.search({
        index: indexName,
        type: "mobile",
        body: {
            "from" : input, "size" : 20,
            query: {
                "match_all": {}
            }
        }
    })
}
exports.getAllData = getAllData;

function initModelMapping() {
    return elasticClient.indices.putMapping({
        index: indexName,
        type: "mapping_mobile",
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
        type: "mapping_mobile"
    });
}
exports.isModelMappingExists = isModelMappingExists;


function addModelMappingDocument(document) {
    return elasticClient.index({
        index: indexName,
        type: "mapping_mobile",
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
