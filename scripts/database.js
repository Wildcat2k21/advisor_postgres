const { Client } = require('pg'); //для работы с базами данных
// require('dotenv').config(); //подключение конфигурации

//пароль от базы данных
const db_password = process.env.DB_PASS;
const db_name = 'advisor_global';
const db_host = 'dpg-cmaotoa1hbls73cmj14g-a';
const db_user = 'advisor_client';
const db_port = 5432;

//объект базы данных
class AdvisorDB {
  constructor() {
    this.client = new Client({
        host: db_host,
        port: db_port,
        database: db_name,
        user: db_user,
        password: db_password
    });

    //подключение
    this.client.connect(err => {
        if(err){
            throw err;
        }
    });
  }

  //посчет записей в таблице
  async count(tableName) {
    try{
        const res = await this.client.query(`SELECT COUNT(*) FROM ${tableName}`);
        return Number(res.rows[0].count);

    }catch(err){
        throw(err);
    }
  }

  //уставноить данные
  async setData(tableName, id, json){
    try{
        const jsonString = JSON.stringify(json);
        const result = await this.client.query(`INSERT INTO ${tableName} (id, data) VALUES ($2, $1::jsonb)`, [jsonString, id]);
        return result;

    }catch(err){
        throw err;
    }
  }

  //обновить данные
  async updateById(tableName, id, json) {
    try{
        const jsonString = JSON.stringify(json);
        const result = await this.client.query(`UPDATE ${tableName} SET data = $1::jsonb WHERE id = $2`, [jsonString, id]);
        return result;

    }catch(err){
        throw err;
    }
  }

  //получить данные
  async getData(tableName, id){
    try{
        const result = await this.client.query(`SELECT DATA FROM ${tableName} WHERE ID = ${id}`);
        return result.rows[0].data;

    }catch(err){
        throw err;
    }

  }

  //закрыть соединение
  async close() {
    try{
        await this.client.end();

    }catch(err){
        throw err;
    }
  }
}

//экпорт модуля для работы с базой
module.exports = AdvisorDB;