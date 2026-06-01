'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TabungStok extends Model {
    static associate(models) {
    }
  }
  TabungStok.init({
    jenis: DataTypes.STRING,
    jumlah_isi: DataTypes.INTEGER,
    jumlah_kosong: DataTypes.INTEGER,
    total: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'TabungStok',
  });
  return TabungStok;
};
