'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LogTabung extends Model {
    static associate(models) {
      LogTabung.belongsTo(models.User, { foreignKey: 'user_id' });
    }
  }
  LogTabung.init({
    user_id: DataTypes.INTEGER,
    jumlah_tabung: DataTypes.INTEGER,
    tanggal: DataTypes.DATE
  }, {
    sequelize,
    modelName: 'LogTabung',
  });
  return LogTabung;
};
