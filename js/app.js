(function () {
  'use strict';

  /**
   * Initializing the app
   * @type {App}
   */
  var app = angular.module('cassandraCrud', []);

  /**
   * dataFactory
   */
  app.service('dataFactory', dataFactory);

  dataFactory.$inject = ['$resource'];

  function dataFactory ($resource) {
    console.log('dataFactory');
    var service = {

    };

    return service;
  }

  /**
   * Table Controller
   */
  app.controller('TableController', TableController);

  TableController.$inject = ['dataFactory'];

  function TableController (dataFactory) {
    var vm = this;

    vm.people = [
      {
        id: 1,
        name: 'Reinaldo A. C. Rauch',
        city: 'Ponta Grossa, Paraná, Brazil',
        email: 'reinaldorauch@gmail.com'
      }
    ];
    vm.remove = removePeople;
    vm.edit   = editPeople;

    function removePeople (id) {
      console.log('Remove', id);
    }

    function editPeople (id) {
      console.log('Edit', id);
    }

  }

  /**
   * FormController
   */
  app.controller('FormController', FormController);

  FormController.$inject = [];

  function FormController () {
    var vm = this;
  }

})();