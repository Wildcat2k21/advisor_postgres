    const DateNow = require('./DateNow'); //для получения времени
   
   //новый дисциплина
    function Subject(title = '', tests = [], updated = DateNow()._full){
        this.titleUnique = title;
        this._lastUpdate = updated;
        this._lastTestDate = '',
        this.tests = tests;
    }

    //новый тест
    function Test(title = '', questions = [], passDate = ''){
        //поля дисциплины
        this.titleUnique = title;
        this._passDate = passDate;
        this.questions = questions;
    }

    //быстрая инициализация дисциплины
    Subject.prototype.init = function(title = '', tests = [], updated = DateNow()._full){
        this.titleUnique = title;
        this.tests = tests;
        this._lastUpdate = updated;
    }

  //быстрая инициализация теста
    Test.prototype.init = function(title = '', questions = [], passDate = ''){
        this.titleUnique = title;
        this._passDate = passDate;
        this.questions = questions;
    }

  module.exports = {Subject, Test};