var request = require('request')
var cheerio = require('cheerio')
var fs = require('fs')
var iconv = require('iconv-lite')
var EventEmitter = require('events').EventEmitter

var event = new EventEmitter();
var web_base //= "http://bbs.tianya.cn/post-no05-112241-"
var web_postfix// = ".shtml"

var charset// = "utf-8"
var louzhu// = "louzhu"
var cur_web_page// = 1
var max_web_pages//=485
var save_file_name// = "如果这是宋史.txt"
var is_lz_says = false
var is_lz_reply = false
var lz_majia
proxiedRequest = request.defaults({'proxy':'http://asia%5Cql02:Password678@10.125.1.254:8080'},
		                        {'https-proxy':'http://asia%5Cql02:Password678@10.125.1.254:8080'});
function save_essential_var(web_url, save_file_name) {
	proxiedRequest({encoding: null,
			url: web_url}, function (error, response, body ) {
		var $ = cheerio.load(iconv.decode(body, 'utf-8').toString())
		$("meta").each(function(i, elem){
			// charset got
			if ($(this).attr('charset') != null) {
				charset = $(this).attr('charset')
			} else {
				charset = "utf-8"
			}
			// louzhu got
			if ($(this).attr('name') == "author") {
				louzhu = $(this).attr('content')
				// some louzhu have its majia, append here handly
				if (web_url == "http://bbs.tianya.cn/post-no05-120226-1.shtml")
					lz_majia = "江湖闲乐生"
			}
		})
		//currunt web index
		cur_web_page = 1
		//total web pages
		$("script").each(function(i, elem){
			if ($(this).text().toString().indexOf("pageCount") > -1) {
				var str_arr = $(this).text().split(",")
				str_arr.forEach(function(entry) {
					if (entry.indexOf("pageCount") > -1) {
						//console.log(entry.slice(entry.indexOf("pageCount : ") + 12, entry.length))
						max_web_pages = parseInt(entry.slice(entry.indexOf("pageCount : ") + 12, entry.length))
					}
				})
			}
		})
		//save file name
		if(save_file_name == null) {
			$("title").each(function(i, elem){
				save_file_name = $(this).text().toString().slice(0, 5) + ".txt"
				save_fd = fs.openSync(save_file_name, 'a')
			})
		} else {
			save_fd = fs.openSync(save_file_name, 'a')
		}
		//web site base got
		web_base=web_url.slice(0, web_url.length - 7)
		//web site posfix got
		web_postfix=web_url.slice(web_url.length - 6, web_url.length)
		event.emit('web_essential_done')
	})
}
function download_save_web(web_url) {
	proxiedRequest({encoding: null,
			url: web_url}, function (error, response, body ) {
		if (!error && response.statusCode == 200) {
			// convert 网页的乱码，转化为gb2312
			//iconv.decode(body, 'gb2312').toString()
			console.log(web_base + cur_web_page + web_postfix + "         Downloading...")
			// 读取出来用的charset,进行设置
			var $ = cheerio.load(iconv.decode(body, charset).toString())
			$("div").each(function(i, elem) {
				//每个楼层
				is_lz_says = false
				is_lz_reply = false
				if ($(this).hasClass("atl-item")) {
					if ($(this).find('div').each(function(d, elem){
						// check if louzhu sayings
						if ($(this).hasClass('atl-info')) {
							$(this).find('span').each(function(s, elem){
								$(this).find('a').each(function(a, elem){
									if ($(this).text() == louzhu || (lz_majia != null && lz_majia == $(this).text())) {
										//console.log($(this).text())
										is_lz_says = true;
									}
								})
							})
						}
						// check if louzhu's first sayings
						if ($(this).hasClass('bbs-content clearfix')) {
							is_lz_says = true
							is_lz_reply = false
						}
						// find if it is louzhu's reply
						if (is_lz_says) {
							$(this).find('div').each(function(c, elem){
								if ($(this).hasClass('bbs-content')) {
									if ($(this).text().toString().indexOf("回复日期") > -1) {
										is_lz_reply = true
									}
								}
							})
						}
					}))
					// read the context out
					if (is_lz_says == true && is_lz_reply == false) {
						$(this).find('div').each(function(d, elem){
							if ($(this).hasClass('bbs-content')) {
								// if louzhu says less than 150 words, think it is not the context of the book
								if ($(this).text().toString().length > 150)
									fs.writeSync(save_fd, $(this).text(), 0)
							}
						})
					}
				}
			})
		}
		event.emit('web_page_saved')
	})
}
function fetch_www_books(web_url, save_file_name) {
	save_essential_var(web_url, save_file_name)
	event.on('web_essential_done', function() {
		console.log("web_base: " + web_base)
		console.log("web_postfix: " + web_postfix)
		console.log("save file name: " + save_file_name)
		console.log("max web pages: " + max_web_pages)
		console.log("current web page: " + cur_web_page)
		console.log("louzhu: " + louzhu)
		console.log("charset: " + charset)	
		download_save_web(web_base + cur_web_page + web_postfix)
		event.on('web_page_saved', function(){
			console.log("++++++++Done++++++++")
			cur_web_page++
			if (cur_web_page > max_web_pages)
				return
			download_save_web(web_base + cur_web_page + web_postfix)
		})
	})
}
//fetch_www_books("http://bbs.tianya.cn/post-no05-112241-1.shtml")

module.exports.fetch_www_books = fetch_www_books
