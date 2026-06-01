'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CarouselImage extends Model {
    static associate(models) {
      // no associations needed
    }
  }
  CarouselImage.init({
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'CarouselImage',
  });
  return CarouselImage;
};
