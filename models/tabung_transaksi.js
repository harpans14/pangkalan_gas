'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TabungTransaksi extends Model {
    static associate(models) {
    }
  }
  TabungTransaksi.init({
    tipe: DataTypes.ENUM('titip', 'pinjam'),
    nama_pelanggan: DataTypes.STRING,
    jenis_tabung: DataTypes.STRING,
    jumlah: DataTypes.INTEGER,
    tanggal: DataTypes.DATEONLY,
    status: DataTypes.ENUM('aktif', 'selesai'),
    keterangan: DataTypes.TEXT
  }, {
    sequelize,
    modelName: 'TabungTransaksi',
  });
  return TabungTransaksi;
};
