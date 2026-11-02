import mysql from 'mysql2/promise';
import { databaseSettings } from './environment';
const pool = mysql.createPool(databaseSettings());
export default pool;
