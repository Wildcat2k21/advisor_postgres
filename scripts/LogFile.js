const DateNow = require('./DateNow'); //для получения времени
const fs = require('fs');
//получение полной даты
const {_date, _time} = DateNow();

//вести логи
function LogFile(filePath){
    //счетчик сообщений в консоли
    let consoleLogsCount = 0;
    //счетчик сообщений в log файле
    let fileLogsCount = 0;
    //функция, которая будет записывать сообщения
    return function log(text){
        //вывод сообщения в консоль
        const str = `[${_date} в ${_time}] - ${text}`;
        //вывод в консоль в том числе
        console.log(str);
        //сохранения строки
        fs.appendFile(filePath, str + '\n', function(err) {
            if (err) {
                console.error('Ошибка при записи в файл:', err);
            } 
            //ввести счетчик логов
            else {
                //повысить счетчик
                consoleLogsCount++;
                fileLogsCount++;
            }
        });

        //очищать консоль каждые 30 сообщений
        if(consoleLogsCount > 30){
            //сбрасывать счетчик логов
            consoleLogsCount = 0;
            //очищать консоль
            console.clear();
        }

        //очищать файл логов каждые 1000 сообщений
        if(fileLogsCount > 1000){
            //сбрасывать счетчик логов
            fileLogsCount = 0;
            //очистка файла логов
            fs.writeFile(filePath, '', function(err) {
                if(err) {
                    console.error('Ошибка при очистке файла:', err);
                }
            });
        }
    }
}

module.exports = LogFile;