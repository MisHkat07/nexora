/*
  Money arithmetic with correct decimal rounding (avoids 0.1 + 0.2 floating point errors)
*/

const currency = require('currency.js');

exports.calculate = {
  add: (firstValue, secondValue) => {
    return currency(firstValue).add(secondValue).value;
  },
  sub: (firstValue, secondValue) => {
    return currency(firstValue).subtract(secondValue).value;
  },
  multiply: (firstValue, secondValue) => {
    return currency(firstValue).multiply(secondValue).value;
  },
  divide: (firstValue, secondValue) => {
    return currency(firstValue).divide(secondValue).value;
  },
};
