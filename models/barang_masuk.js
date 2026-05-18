'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BarangMasuk extends Model {
    static associate(models) {
      BarangMasuk.belongsTo(models.Produk, { foreignKey: 'produk_id' });
      BarangMasuk.belongsTo(models.User, { foreignKey: 'createdBy' });
    }
  }
  BarangMasuk.init({
    produk_id: DataTypes.INTEGER,
    jumlah: DataTypes.INTEGER,
    keterangan: DataTypes.TEXT,
    tanggal: DataTypes.DATE,
    createdBy: DataTypes.INTEGER
  }, {
    sequelize,
    modelName: 'BarangMasuk',
  });
  return BarangMasuk;
};
