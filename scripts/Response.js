//для работы со статусами и ответами
function Response(code = null, message = '', data = {}){
    this.status_code = code;
    this.message = message;
    this.data = data;
}

//отложенная установка статуса
Response.prototype.status = function(code, message, data){
    this.status_code = code || this.status_code;
    this.message = message || this.message;
    this.data = data || this.data;
}

module.exports = Response;