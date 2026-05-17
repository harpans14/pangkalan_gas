'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    static associate(models) {
      User.hasMany(models.Transaksi, { foreignKey: 'user_id' });
      User.hasMany(models.LogTabung, { foreignKey: 'user_id' });
      User.hasMany(models.Produk, { foreignKey: 'createdBy' });
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
    modelName: 'User',
  });
  return User;
};
