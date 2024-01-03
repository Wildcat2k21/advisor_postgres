//сравнение строк по ливенштейну
const {levenshtein} = require('./Crypt.js');

//подключение методов кодирования и декодирования кириллицы
const Crypt = require('./Crypt.js');
const decodeText = Crypt.decodeText;
const encodeText = Crypt.encodeText;
const equvalentData = Crypt.equvalentData;

//создание нового объекта со свойствами декодирования
const Cathegory = function(obj){
  for (let key in obj) {
    this[key] = obj[key];
  }

  //количество ответов в методичке
  this.questions_total_count = 0;

  //подсчет количества ответов
  this.count_questions = function(){
    //счетчик вопросов
    let count_q = 0;
    //по дсициплинам
    this.subjects.forEach(sub => {
      //по тестам
      sub.tests.forEach(test => {
        //по вопроосам
        test.questions.forEach(ques => {
          //подсчет вопросов
          count_q++;
        })
      })
    });

    //подсчитанное количество ответов в методичке
    this.questions_total_count = count_q;

    //результат подсчета
    return count_q;
  }
}

// Метод декодирования для экземпляра
Cathegory.prototype.decodeFieldsURI = function(){
  // Создаем копию объекта
  let decodedObject = new Cathegory(JSON.parse(JSON.stringify(this)));
  
  function decode(obj) {
      for (let key in obj) {
          if(obj.hasOwnProperty(key)){
              if (typeof obj[key] === 'string' && key.charAt(0) !== '_') {
                  obj[key] = decodeText(obj[key]);
              } else if (typeof obj[key] === 'object') {
                  decode(obj[key]);
              }
          }
      }
  }
  
  // Применяем функцию декодирования к копии объекта
  decode(decodedObject);
  
  // Возвращаем декодированный объект
  return decodedObject;
};

// Метод для кодирования символов кириллицы
Cathegory.prototype.encodeFieldsURI = function(){
  // Создаем копию объекта
  let encodedObject = new Cathegory(JSON.parse(JSON.stringify(this)));
  
  function encode(obj) {
      for (let key in obj) {
          if(obj.hasOwnProperty(key)){
              if (typeof obj[key] === 'string' && key.charAt(0) !== '_') {
                  obj[key] = encodeText(obj[key]);
              } else if (typeof obj[key] === 'object') {
                  encode(obj[key]);
              }
          }
      }
  }
  
  // Применяем функцию кодирования к копии объекта
  encode(encodedObject);
  
  // Возвращаем закодированный объект
  return encodedObject;
};

//поиск вопроса в дисциплине
Cathegory.prototype.findByQuestion = function(subId, questId, levenshtein_campare = true){

  //если параметр не указан, вернуть объект
  if(!subId && !questId) return this;

  //поиск ответов по ливенштейну
  let sub, quest, levenshtein_item =  {
    simularity: Infinity,
    question: undefined
  };

  //поиск в предметах
  sub = {...this.subjects.find(_sub => equvalentData(_sub.titleUnique) === equvalentData(subId))};

  //поиск вопроса в тестах дисциплины
  if(questId){
    if(Object.keys(sub).length){
      //поиск теста в  дисциплинах
      for(let test of sub.tests){
        //поиск вопроса в тестах дисциплины
        for(let question of test.questions){
          //эквивалентный поиск со сравнением по ливенштейну
          if(levenshtein_campare){

            //индекс ливенштейна
            const lev_indx = levenshtein(equvalentData(question.titleUnique), equvalentData(questId));

            //если новый индекс больше предыдущего
            if(lev_indx < levenshtein_item.simularity){
              levenshtein_item.simularity = lev_indx;
              levenshtein_item.question = question;
            }

          //эквивалентный поиск 
          } else {
              if(equvalentData(question.titleUnique) === equvalentData(questId)){
                quest = question;
                //прекратить поиск
                break;
              }

          }
        }
      }

      //если поиск по ливенштейну
      if(levenshtein_campare){
        quest = {simularity: levenshtein_item.simularity, ...levenshtein_item.question};
      }
    }

    //указан но пуст
    if(!quest) quest = {}
  }

  //вернуть результат
  return quest || sub;

}

//поиск элементов
Cathegory.prototype.findItems = function(subId, testId, questId, selId){

    //если нечего не указано
    if(!subId && !testId && !questId && !selId) return this;

    //результаты поиска
    let sub, test, quest, sel;

    //дисциплина
    sub = {...this.subjects.find(_sub => {
      //привести к эквивалентной форме
      const eqv_title = equvalentData(_sub.titleUnique);
      //привести к эквивалентной форме
      const eqv_arg_title = equvalentData(subId);
      //сравнение в эквивалентной форме
      return eqv_title === eqv_arg_title;

    })};

    //поиск в тестах
    if(testId){
      if(Object.keys(sub).length){
        test = {...sub.tests.find( _test => {
          //привести к эквивалентной форме
          const eqv_title = equvalentData(_test.titleUnique);
          //привести к эквивалентной форме
          const eqv_arg_title = equvalentData(testId);
          //сравнение в эквивалентной форме
          return eqv_title === eqv_arg_title;

      })}} else {
        //не найден
        test = {};
      }
    } 

    //поиск в вопросах
    if(questId){
      if(Object.keys(test).length){
        quest = {...test.questions.find( _quest => {
            //привести к эквивалентной форме
            const eqv_title = equvalentData(_quest.titleUnique);
            //привести к эквивалентной форме
            const eqv_arg_title = equvalentData(questId);
            //сравнение в эквивалентной форме
            return eqv_title === eqv_arg_title;
            
      })}} else {
        //не найден
        quest = {};
      }
    }

    //поиск в селектах
    if(selId){
      if(Object.keys(quest).length){
        sel = {...quest.selects.find( _sel => {
            //привести к эквивалентной форме
            const eqv_title = equvalentData(_sel.titleUnique);
            //привести к эквивалентной форме
            const eqv_arg_title = equvalentData(selId);
            //сравнение в эквивалентной форме
            return eqv_title === eqv_arg_title;

      })}} else {
        //не найден
        sel = {};
      }
    }

    //вернуть
    return sel || quest || test || sub;
}


module.exports = Cathegory;