'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Transaksis', 'metode_pembayaran', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('Transaksis', 'status_pembayaran', {
      type: Sequelize.STRING,
      defaultValue: 'belum_bayar'
    });
    await queryInterface.addColumn('Transaksis', 'bukti_pembayaran', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Transaksis', 'metode_pembayaran');
    await queryInterface.removeColumn('Transaksis', 'status_pembayaran');
    await queryInterface.removeColumn('Transaksis', 'bukti_pembayaran');
  }
};
