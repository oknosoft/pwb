/**
 * ### Модуль сборки *.js по описанию метаданных
 * &copy; Evgeniy Malyarov http://www.oknosoft.ru 2014-2017
 *
 * @module  metadata-prebuild
 */

"use strict";

var through = require('through2');
var path = require('path');
var gutil = require('gulp-util');

var PluginError = gutil.PluginError;
var File = gutil.File;

module.exports = function () {

  // конфигурация подключения к CouchDB
  const config = require('../config/app.settings.js')();

  let $p = require('../lib/metadata.core.js');    // подключим метадату 'metadata-js'
	let firstFile = null;
	let jstext = "";                    // в этой переменной будем накапливать текст модуля

	// установим параметры
	$p.on("settings", (prm) => {

    // разделитель для localStorage
    prm.local_storage_prefix = config.local_storage_prefix;

    // по умолчанию, обращаемся к зоне 0
    prm.zone = config.zone;

    // в качестве расположения couchdb используем couch_local
    prm.couch_path = config.couch_local || config.couch_path;

	});
	$p.eve.init();


	function create_modules(_m){

	  const fs = require('fs');
	  const scheme_settings = fs.readFileSync('./node_modules/metadata-abstract-ui/src/scheme_settings.js', 'utf8').replace('export default ', '');
	  const sys_nsmes = ["log","meta_objs","meta_fields","scheme_settings"];
	  const categoties = {
      cch: {mgr: "ChartOfCharacteristicManager", obj: "CatObj"},
      cacc: {mgr: "ChartOfAccountManager", obj: "CatObj"},
      cat: {mgr: "CatManager", obj: "CatObj"},
      bp: {mgr: "BusinessProcessManager", obj: "BusinessProcessObj"},
      tsk: {mgr: "TaskManager", obj: "TaskObj"},
      doc: {mgr: "DocManager", obj: "DocObj"},
      ireg: {mgr: "InfoRegManager", obj: "RegisterRow"},
      areg: {mgr: "AccumRegManager", obj: "RegisterRow"},
      dp: {mgr: "DataProcessorsManager", obj: "DataProcessorObj"},
      rep: {mgr: "DataProcessorsManager", obj: "DataProcessorObj"}
    };

		let text = "$p.md.create_managers=function(){\n" +
        "// создаём системные менеджеры (журнал регистрации, метаданные и настройки компоновки)\n" +
        "$p.ireg.log = new $p.LogManager();\n" +
				"$p.cat.meta_objs = new $p.MetaObjManager();\n" +
				"$p.cat.meta_fields = new $p.MetaFieldManager();\n\n" + scheme_settings + "\n" +
				"scheme_settings.call($p);\n";

		// менеджеры перечислений
		for(let name in _m.enm){
      text+= "$p.enm." + name + " = new $p.EnumManager('enm." + name + "');\n";
    }

		// менеджеры объектов данных, отчетов и обработок
		for(let category in categoties){
			for(let name in _m[category]){
			  if(name == 'scheme_settings'){
			    continue
        }
        text+= obj_constructor_text(_m, category, name, categoties[category].obj);
        if(sys_nsmes.indexOf(name) == -1){
          text+= "$p." + category + "." + name + " = new $p." + categoties[category].mgr + "('" + category + "." + name + "');\n";
        }
			}
		}

		return text + "};\n";

	}

	function obj_constructor_text(_m, category, name, proto) {

		var meta = _m[category][name],
			fn_name = $p.DataManager.prototype.obj_constructor.call({class_name: category + "." + name}),
			text = "\n/**\n* ### " + $p.msg.meta[category] + " " + meta.name,
			f, props = "";

		text += "\n* " + (meta.illustration || meta.synonym);
		text += "\n* @class " + fn_name;
		text += "\n* @extends " + proto;
		text += "\n* @constructor \n*/\n";
		text += "function " + fn_name + "(attr, manager){" + fn_name + ".superclass.constructor.call(this, attr, manager)}\n";
		text += fn_name + "._extend($p." + proto + ");\n";
		text += "$p." + fn_name +  " = " + fn_name + ";\n";

		// реквизиты по метаданным
		if(meta.fields){
			for(f in meta.fields){
				if(props)
					props += ",\n";
				props += f + ": {get: function(){return this._getter('"+f+"')}, " +
					"set: function(v){this._setter('"+f+"',v)}, enumerable: true, configurable: true}";
			}
		}else{
			for(f in meta.dimensions){
				if(props)
					props += ",\n";
				props += f + ": {get: function(){return this._getter('"+f+"')}, " +
					"set: function(v){this._setter('"+f+"',v)}, enumerable: true, configurable: true}";
			}
			for(f in meta.resources){
				if(props)
					props += ",\n";
				props += f + ": {get: function(){return this._getter('"+f+"')}, " +
					"set: function(v){this._setter('"+f+"',v)}, enumerable: true, configurable: true}";
			}
			for(f in meta.attributes){
				if(props)
					props += ",\n";
				props += f + ": {get: function(){return this._getter('"+f+"')}, " +
					"set: function(v){this._setter('"+f+"',v)}, enumerable: true, configurable: true}";
			}
		}

		if(props)
			text += fn_name + ".prototype.__define({" + props + "});\n";


  // табличные части по метаданным
  for(var ts in meta.tabular_sections){

    props = "";

			// создаём конструктор строки табчасти
			var row_fn_name = $p.DataManager.prototype.obj_constructor.call({class_name: category + "." + name}, ts);

			text+= "function " + row_fn_name + "(owner){" + row_fn_name + ".superclass.constructor.call(this, owner)};\n";
			text+= row_fn_name + "._extend($p.TabularSectionRow);\n";
			text+= "$p." + row_fn_name + " = " + row_fn_name + ";\n";

			// в прототипе строки табчасти создаём свойства в соответствии с полями табчасти
			for(var rf in meta.tabular_sections[ts].fields){

				if(props)
					props += ",\n";

				props += rf + ": {get: function(){return this._getter('"+rf+"')}, " +
					"set: function(v){this._setter('"+rf+"',v)}, enumerable: true, configurable: true}";
			}

			if(props)
				text += row_fn_name + ".prototype.__define({" + props + "});\n";

			// устанавливаем геттер и сеттер для табличной части
			text += fn_name + ".prototype.__define('"+ts+"', {get: function(){return this._getter_ts('"+ts+"')}, " +
				"set: function(v){this._setter_ts('"+ts+"',v)}, enumerable: true, configurable: true});\n";

		}

		return text;

	}

	// складываем содержимое входных файлов в jstext
	function bufferContents(file, enc, cb) {

		// ignore empty files
		if (file.isNull()) {
			cb();
			return;
		}

		// we don't do streams (yet)
		if (file.isStream()) {
			this.emit('error', new PluginError('gulp-concat',  'Streaming not supported'));
			cb();
			return;
		}

		if (!firstFile) {
			firstFile = file;
		}

		if(path.extname(file.path) == ".js"){
			if(jstext)
				jstext += "\n";
			jstext += file.contents.toString();
		}

		cb();
	}

	function endStream(cb) {

		var joinedFile,
			t = this;

		// if file opt was a file path
		// clone everything from the latest file
		if (firstFile) {
			joinedFile = firstFile.clone({contents: false});
			joinedFile.path = path.join(firstFile.base, 'prebuild.js');
		} else {
			joinedFile = new File(path.join(__dirname, 'prebuild.js'));
		}

		$p.md.init($p.wsql.pouch.local._meta)
			.then(function (_m) {

				// создаём текст модуля конструкторов данных
				var text = create_modules(_m);

				// выполняем текст модуля, чтобы появились менеджеры
				eval(text);
				$p.md.create_managers();

				// получаем скрипт таблиц
				$p.md.create_tables(function (sql) {

					text = "$p.wsql.alasql('" + sql + "', []);\n\n"
						+ text + "\n\n"
						+ "$p.md.init(" + JSON.stringify(_m) + ");\n\n" + jstext;

					joinedFile.contents = new Buffer(text);
					t.push(joinedFile);

					// информируем внешний скрипт о завершении нашей работы
					cb();

					// отключаем все подписки и выгружаем менеджеров
					$p.off();
					for(var s in $p.wsql.pouch.local.sync){
						try{
							$p.wsql.pouch.local.sync[s].cancel();
						}catch(e){}
					}
					$p = null;

				})

			})
			.catch(function (err) {
				throw new PluginError('metadata-prebuild', err);
			});
	}

	return through.obj(bufferContents, endStream);
};
