'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      // define association here
    }
  }
  User.init({
    username: DataTypes.STRING,
    password: DataTypes.STRING,
    no_ktp: DataTypes.STRING,
    role: DataTypes.ENUM('pangkalan', 'pembeli'),
    sub_role: DataTypes.ENUM('rumahtangga', 'usaha_mikro', 'none'),
    alamat: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'User', // PASTIKAN NAMANYA 'User'
  });
  return User; // <--- INI HARUS ADA DAN TIDAK BOLEH TYPO
};