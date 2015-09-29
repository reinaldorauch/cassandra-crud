(function () {
  'use strict';

  /**
   * Initializing the app
   * @type {App}
   */
  var app = angular.module('cassandraCrud', ['ngResource']);

  /**
   * dataFactory
   */
  app.factory('dataFactory', dataFactory);

  dataFactory.$inject = ['$resource', '$q', '$rootScope'];

  function dataFactory ($resource, $q, $rootScope) {
    var People = $resource('http://localhost:60000/people/:id');

    var service = {
      listPeople: listPeople,
      getPerson: getPerson,
      savePerson: savePerson,
      removePerson: removePerson
    };

    function listPeople () {
      var def = $q.defer();

      var ppls = People.query(function () {
        def.resolve(ppls);
      });

      return def.promise;
    }

    function getPerson (id) {
      var def = $q.defer();

      var person = People.get({id: id}, function () {
        def.resolve(person);
      });

      return def.promise;
    }

    function savePerson (person) {
      person = new People(person);
      return person.$save(function () {
        $rootScope.$emit('update');
      });
    }

    function removePerson (id) {
      return People.remove({id: id}).$promise.then(function () {
        $rootScope.$emit('update');
      });
    }

    return service;
  }

  /**
   * Table Controller
   */
  app.controller('TableController', TableController);

  TableController.$inject = ['$rootScope', 'dataFactory'];

  function TableController ($rootScope, dataFactory) {
    var vm = this;

    vm.people = [];
    vm.remove = removePerson;
    vm.edit   = editPeople;

    init();

    function init() {
      getPeople();

      $rootScope.$on('update', getPeople);
    }

    function removePerson (id) {
      dataFactory.removePerson(id);
    }

    function editPeople (id) {
      console.log('Edit', id);
    }

    function getPeople() {
      dataFactory.listPeople()
        .then(function (ppl) {
          vm.people = ppl;
        });
    }

  }

  /**
   * FormController
   */
  app.controller('FormController', FormController);

  FormController.$inject = ['$rootScope', 'dataFactory'];

  function FormController ($rootScope, dataFactory) {
    var vm = this;

    vm.person = {};

    vm.save = save;

    init();

    function init() {
      $rootScope.$on('update', clearForm);
    }

    function save () {
      dataFactory.savePerson(vm.person);
    }

    function clearForm () {
      vm.person = {};
    }

  }

})();