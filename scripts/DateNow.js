//получение времени
function DateNow(){
    let date = new Date();
    let day = ("0" + date.getDate()).slice(-2);
    let month = ("0" + (date.getMonth() + 1)).slice(-2);
    let year = date.getFullYear();
    let hours = ("0" + date.getHours()).slice(-2);
    let minutes = ("0" + date.getMinutes()).slice(-2);

    //вернуть объект времени
    return {
      _date: day + "\." + month + "\." + year,
      _time: hours + "\:" + minutes,
      _full: day + "\." + month + "\." + year + " " + hours + "\:" + minutes
    }
}

module.exports = DateNow;