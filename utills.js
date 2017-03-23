/** Convert Date to yyyy-mm-dd HH:ii:ss format*/

function convertDate(date) {
    var yyyy = date.getFullYear().toString();
    var mm = (date.getMonth()+1).toString();
    var dd  = date.getDate().toString();

    var hh  = date.getHours().toString();
    var ii  = date.getMinutes().toString();
    var ss  = date.getSeconds().toString();

    var mmChars = mm.split('');
    var ddChars = dd.split('');
    var hhChars = hh.split('');
    var iiChars = ii.split('');
    var ssChars = ss.split('');

    return yyyy + '-' + (mmChars[1]?mm:"0"+mmChars[0]) + '-' + (ddChars[1]?dd:"0"+ddChars[0]) + " " +
        (hhChars[1]?hh:"0"+hhChars[0]) + ":" + (iiChars[1]?ii:"0"+iiChars[0]) + ":" + (ssChars[1]?ss:"0"+ssChars[0]);
}

exports.convertDate = convertDate;