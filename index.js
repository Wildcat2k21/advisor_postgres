// require('dotenv').config(); //подключение конфигурации
const fs = require('fs').promises; // Подключаем модуль для работы с файловой системой
const path = require('path'); // Подключаем модуль для работы с путями
const express = require('express'); //для работы с API
const cors = require('cors'); //для крос доменных запросов
const AdvisorDB = require('./scripts/database'); // для работы с базами
const advisorDB = new AdvisorDB();

//@ ---- equvalentData ------ метод уточнения вопросов, как соберется архив убрать, сохранив данные.

//файлы для хранения и извлечения данных
const archiveJson = './data_json/archive.json'; 
const usersJson = './data_json/users.json';
const logPath = path.join(__dirname, 'log.txt');

//модулли приложения
const Cathegory = require('./scripts/Cathegory');
//для кодирования и декодирования полей
const {equvalentData} = require('./scripts/Crypt');
//для работы с дисциплинами и тестами
const {Subject, Test} = require('./scripts/Subject');
//для работы со статусами
const Response = require('./scripts/Response');
//для введения логов о состоянии работы
const LogFile = require('./scripts/LogFile');
//экземпляр функции логов
const log = LogFile(logPath);

//Проверка, ведется ли запись в архиве
let archiveIsDoneWriting = true; 
//для отложенной записи в архив
let achiveStockInLoop = false;
//проверка ведется ли запись в пользователях
let usersIsDoneWriting = true;
//для отложенной записи пользователей
let usersStockInLoop = false;

//API ROOT ДОСТУП
const API_ROOT_KEY = process.env.API_ROOT_KEY;
//хост приложенияэ
const APP_HOST =  process.env.APP_HOST;
//актуальная версия плагина
const valid_script_version = '4.2.0';
//количество вопросов в базе
quest_total_count = 0;

//настройка сервера
const app = express();
const port = process.env.PORT || 3000;
app.use(cors()); //для крос доменных запросов
app.use(express.json()); // Для обработки JSON в теле запроса

//категории дисциплин
let cathegories = new Cathegory({subjects: []});
//пользователи
let totalUsers = [];

//входная точка
async function entryPoint(){
  const countUsersInDb = await advisorDB.count('users');
  const countArchiveData = await advisorDB.count('archive');

  //еслит данных нет
  if(countUsersInDb === 0){
    log("Данные пользователей в базе данных users не найдены, будет выполнена попытка чтения users.json");
    try {
      const total_users_data = await fs.readFile(usersJson, 'utf8');
      //извлечение данных из массива пользователей
      totalUsers = JSON.parse(total_users_data);
      //сохранение данных в базу данных
      advisorDB.setData('users', 1, totalUsers);

    }
    catch(err){
      log('ERROR, ошибка при подгрузки данных users: ' + err);
    }
  
  //если данные пользователей найдены в базе
  } else {
    totalUsers = await advisorDB.getData('users', 1);
  }

  if(countArchiveData === 0){
    log("Данные ответов в базе данных archive не найдены, будет выполнена попытка чтения archive.json");
    try{
      const total_archive_data = await fs.readFile(archiveJson, 'utf8');
      //создание экземпляра
      cathegories = new Cathegory(JSON.parse(total_archive_data));
      //сохранение данных в базу данных
      advisorDB.setData('archive', 1, cathegories);

    }catch(err){
      log('ERROR, ошибка при подгрузки данных archive: ' + err);
    }

  //если данные ответов найдены в базе
  } else {
    const data_db_archive = await advisorDB.getData('archive', 1);
    cathegories = new Cathegory(data_db_archive);
  }

  //количество вопросов в базе
  quest_total_count = cathegories.count_questions();
  //вывод данных, что прочел
  log("Ответов в базе: " + quest_total_count);


  //доступ к данным через API !!!!ПОТОМ ИЗМЕНИТЬ
  app.get('/questions/:subjectId?/:questionId?/', (req, res) => {
    //новое сообщение
    const message = new Response();
    //параметры из запроса
    const {subjectId, questionId} = req.params;
    //поиск значений по указаным параметрам
    const response_body = cathegories.findByQuestion(subjectId, questionId);
    //успешно выполненный запрос
    if(response_body.simularity > 0){
      //сообщение о неудачном поиске
      message.status(207, 'not sure', response_body); 
    }else if(!Object.keys(response_body).length){
      //сообщение о неудачном поиске
      message.status(404, 'not founded', response_body);
    }else{
      //сообщение если элементы найдены
      message.status(200, 'successfull', response_body);
    }

    //!!!Если буду использовать кирилицу добавить content-type!!!
    res.json(message); 
  })


  //доступ к данным через API !!!!ПОТОМ ИЗМЕНИТЬ
  app.get('/items/:subjectId?/:testId?/:questionId?/:selectId?', (req, res) => {
    //новое сообщение
    const message = new Response();
    //параметры из запроса
    const {subjectId, testId, questionId, selectId} = req.params;
    //поиск значений по указаным параметрам
    const response_body = cathegories.findItems(subjectId, testId, questionId, selectId);
    //успешно выполненный запрос
    if(!Object.keys(response_body).length){
      //сообщение о неудачном поиске
      message.status(404, 'not founded', response_body);
    } else {
      //сообщение если элементы найдены
      message.status(200, 'successfull', response_body);
    }
    
    //!!!Если буду использовать кирилицу добавить content-type!!!
    res.json(message); 
  });

  //получение новых данных
  app.post('/items', (req, res) => {

    //новое сообщение
    let message = new Response();

    try{
      //обновление данных в имеющихся категориях
      updateStuffCathergories(req.body);
      //создание снапшота архива
      if(archiveIsDoneWriting) updateArchiveJson();
      //для отложенной записи в архив
      else startPendingArchiveUpdate();
      //Успешно
      message.status(200, 'successfull');


    }catch(err){
      //Успешно
      message.status(409, 'bad response');
    }

    //отправить ответ
    res.json(message);
  });

  //веб-доступные материалы
  app.use('/public', express.static(path.join(__dirname, 'public')));
  
  // Маршрут users с проверкой API-ключа
  app.get('/users', checkApiKey, (req, res) => {
      //отправить информацию о пользователях
      const message = new Response(200, "successfull", totalUsers);
      res.json(message);
  });

  // Маршрут users с проверкой API-ключа
  app.get('/logs', checkApiKey, (req, res) => {
    //отправить информацию о пользователях
    const logData = getLogs();
    //ожидание чтения и отправка
    logData.then(textContent => {
      const message = new Response(200, 'successfull', data = {logs: textContent});
      res.json(message);
    })
  });

  //получение данных о пользователе
  app.post('/user', (req, res) => {
    
    //ip адреса пользователей
    const ip_list = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    //ip адрес пользователей
    const ip = ip_list.split(',')[0];
    //вычисление пользователя по ip
    const isUserIsExist = totalUsers.find(user => user.ip === ip);
    //новый ответ
    const message = new Response();
    //име пользователя
    let user_name, user;
    //добавить пользователя, если не существует
    if(!isUserIsExist){
      //проверка на приемлимое имя
      if(typeof req.body.fullname !== 'string' || typeof  req.body.email !== 'string'){
        message.status(409, "invalid user name");
        return res.json(message);
      }

      //получение ip адреса и информации о пользователе
      user = {ip: ip, fullname: req.body.fullname, email: req.body.email};
      //име пользвоателя
      user_name = user.fullname.split(' ')[1] || user.fullname.split(' ')[0];
      //тут реализовать обработку и сохранение данных
      log(`Добавлен новый пользователь : ${req.body.fullname}; ip: ${ip}`);
      //добавление пользователя в список
      totalUsers.push(user);
      //добавить запись в архив с пользователями
      if(usersIsDoneWriting) updateTotalUsers();
      //для отложенной записи пользователей
      else startPendingUsersUpdate();

    } else {
      //получение имени существующего пользователя
      user_name = isUserIsExist.fullname.split(' ')[1] || isUserIsExist.fullname.split(' ')[0]

    }

    //формирование HTML
    const hiMessage = hiMessageStroke(user_name);
    //сообещние
    const hi_data = {
      valid_script_version: valid_script_version,
      //приветствие от сервера
      hiMess: {
        text: hiMessage,
        usingHtml: true,
        status: 'HIMESS',
        textAlign: false,
        show_interval: 1
      }
    }

    //установить статус 200
    message.status(200, 'seccessfull', hi_data);
    //передать сообщение пользователю
    res.json(message);
  })

  // Middleware для проверки API-ключа
  function checkApiKey(req, res, next) {
    //получение ключа из загловков
    const apiKey = req.headers['api-key'];
    //новый запрос
    const message = new Response();
  
    //если ключ не указан
    if (!apiKey) {
        message.status(401, 'field API-key in header is empty');
        res.json(message);
        return;
    }
    //если ключь неверный
    if (apiKey !== API_ROOT_KEY) {
        message.status(403, 'Invalid API-key');
        res.json(message);
        return;
    }
    
    //следующая функция обработчик
    next();
  }
}

entryPoint();


//приветственный запуск
app.listen(port, '0.0.0.0', () => {
    console.clear();
    log(`Сервер запущен на http://localhost:${port}`);
    log(`Вы можете сделать GET запрос на http://localhost:${port}/items (для локального тестирования)`);
    log(`Вы можете сделать POST запрос на http://localhost:${port}/items (для локального тестирования)`);
});

// Функция для создания нового теста
function createTest(json) {
  const test = new Test();
  test.init(json.testTitleUnique, json.questions, json.createdDate);
  return test;
}

// Функция для создания нового предмета
function createSubject(json, test) {
  const subject = new Subject();
  subject.init(json.subjectTitleUnique, [test]);
  return subject;
}

// Функция для добавления нового вопроса в тест
function addQuestionToTest(testInSubject, question, subject) {
  //поиск вопроса среди существующих
  const questionInTest = testInSubject.questions.find(exist_question => equvalentData(question.titleUnique) === equvalentData(exist_question.titleUnique));

  // Если вопрос не найден
  if (!questionInTest) {
    // Добавить вопрос в тест
    testInSubject.questions.push(question);
    // Счетчик вопросов в методичке
  } else {
    // Вопрос найден и надо теперь смотреть по селектам, есть ли среди них новые
    question.selects.forEach(select => {
      // Поиск варианта ответа в вопросе
      const selectIndex = questionInTest.selects.findIndex(exist_select => equvalentData(exist_select.titleUnique) === equvalentData(select.titleUnique));

      // Если вариант ответа в вопросе не найден то добавить
      if (!questionInTest.selects[selectIndex]) {
        questionInTest.selects.push(select);
      } else {
        // Тут надо сравнить новый результат со старым, и сделать вывод, заменять или нет
        if (Math.abs(select.weight)) {
          // Заменить результаты в тесте на известные (Правильный или неправильный)
          questionInTest.selects[selectIndex] = select;
        }
      }
    });
  }
}

// Отдельная отработка сценариев добавления ответов
const updateStuffCathergories = (json) => {
  // Новый тесты и дисциплины
  const test = createTest(json);
  const subject = createSubject(json, test);

  // Поиск нового предмета
  if (!cathegories.subjects.length) {
    // Добавь новую дисциплину в категории
    cathegories.subjects.push(subject);
  } else {
    // Поиск предмета в категориях
    const subjectInCathgories = cathegories.subjects.find(sub => equvalentData(sub.titleUnique) === equvalentData(json.subjectTitleUnique));
    // Если нет добавить в новую категорию дисциплин или уточнить тесты для старой
    if (!subjectInCathgories) {
      // Добавь новую дисциплину в категории
      cathegories.subjects.push(subject);
    } else {
      // Дополнить тест, если не представлен в данной дисциплине
      const testInSubject = subjectInCathgories.tests.find(_test => equvalentData(_test.titleUnique) === equvalentData(json.testTitleUnique));

      // Если не найден тест в предмете
      if (!testInSubject) {
        // Добавить тест в категорию
        subjectInCathgories.tests.push(test);
      } else {
        // Все вопросы теста сравнить со старыми, добавить новые если существуют
        json.questions.forEach(question => {
          addQuestionToTest(testInSubject, question, subject);
        });
      }
    }
  }
};

/////////////////////////////////////Создание снапшотов результатов/////////////////////////////////////////

//Создание резервных копий
async function updateArchiveJson(){

  //установка статуса записи
  archiveIsDoneWriting = false;

  try{
    //обновление полей в archive в бд
    await advisorDB.updateById('archive', 1, cathegories)
    //количество вопросов в базе
    quest_total_count = cathegories.count_questions();
    //вывод данных, что прочел
    log(`Данные таблицы archive были успешно обновлены: ${quest_total_count}`);
    
  }catch(err){
    //вывод об ошибке
    log(`ERROR: ${err.message}`);

  }finally{
    // Установка флага в true после успешной записи
    archiveIsDoneWriting = true;

  }
}


//чтение файла логов
async function getLogs(){
  //для лог файла
  let logFileContent;

  try{ 
    //чтение файла logs
    logFileContent = await fs.readFile('log.txt', 'utf8');

  }catch(err){
    //ошибка при чтении
    log(`Не удалось прочитать содержимое файла logs: ${err.message}`);

  }

  //возврат результатов
  return logFileContent;
}

//отложенное обновление списка пользователей
async function updateTotalUsers(){
  //установка статуса записи
  usersIsDoneWriting = false;

  try{
    // Запись обновленных данных обратно в файл
    await advisorDB.updateById('users', 1, totalUsers);
    //сообщение
    log('Данные таблицы users были успешно обновлены');

  }catch(err){
    //вывод об ошибке
    log(`ERROR: ${err.message}`)

  }finally{
    //Установка флага в true после успешной записи
    usersIsDoneWriting = true;

  }
}

//отложенная перезапись отклоненных файлов c пользователями
const startPendingUsersUpdate = () => {

  //отклонения попыток запуска если запущен
  if(!usersStockInLoop){
    //интервал
    let interval;
    //замкнуть цикл
    usersStockInLoop = true;

    //принудительное интервальное обновление файла
    const itervalUpdating = () => {
      //если завершился
      if(usersIsDoneWriting){
        //разомкнуть цикл
        usersStockInLoop = false;
        //прервать цикл
        clearInterval(interval);
        //перезаписать отклоненные данные
        updateTotalUsers();
      }
    }

    //сам интервал обновления
    interval = setInterval(itervalUpdating, 10000);
    //сообщение о отложенной записи
    log("Имеются несохраненные данные о пользователях, было запущено отложенное сохранение.");
  }
}

//отложенная перезапись отклоненных файлов
const startPendingArchiveUpdate = () => {
  //отклонения попыток запуска если запущен
  if(!achiveStockInLoop){
    //интервал
    let interval;
    //замкнуть цикл
    achiveStockInLoop = true;

    //принудительное интервальное обновление файла
    const itervalUpdating = () => {
      //если завершился
      if(archiveIsDoneWriting){
        //разомкнуть цикл
        achiveStockInLoop = false;
        //прервать цикл
        clearInterval(interval);
        //перезаписать отклоненные данные
        updateArchiveJson();
      }
    }

    //сам интервал обновления
    interval = setInterval(itervalUpdating, 30000);
    //сообщение о отложенной записи
    log("Имеются несохраненные данные ответов, было запущено отложенное сохранение.");
  }
}

/////////////////////////////////для тестов///////////////////////////
function hiMessageStroke(user_name){
  const messageHTML = `<div style="font-size: 13px; display: flex; flex-direction: column; width: 400px;"><span style="padding: 0px 0px 30px 15px;" id="yui_3_17_2_1_1703849807769_58"><span style="text-align: center; font-size: 60px; display: block;" id="cool_text"><span style="vertical-align: bottom; background-image: url('${APP_HOST}public/img/ghost.jpg'); width: 70px; height: 80px; display: inline-block;  background-size: cover;"></span>ADVISOR<span style="font-size: 30px;"> ${valid_script_version}</span></span> <h4>Здравствуйте ${user_name}, давайте приступим ?</h4><br>Не забывайте сохранять результаты своих тестов, это можно сделать зайдя в просмотр теста.<br>Сохранение результатов будет происходить автоматически, как только какой-то участник сдаст тест, его результаты станут доступными другим участникам. Данный проект работает с любыми тестами на данном электронном портале. Проходите тесты, улучшайте имеющиеся результаты. <br><br>
  На данный момент архив содержит порядка <b style="text-decoration: underline;">${cathegories.count_questions()}</b> ответов на тестирования по различным дисциплинам и это число постоянно растет. По некоторым вопросам информация может отсутствовать в связи отсутствием данных, будьте первыми, кто эти данные предоставит.
  <br><br> Если стакнетесь с ошибками, пишите во  <a target="_blank" href="https://vk.com/id506279907" id="yui_3_17_2_1_1703849807769_60">ВКонтакте</a> или <a href="https://t.me/Albert_zero2" target="_blank">Телеграм</a></span></div>`
  return messageHTML;
}

//искуственная задержка
// const freeze = ms => new Promise(res => setTimeout(()=>res(), ms));

