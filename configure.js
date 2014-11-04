exports.config = {
    name: 'nrm',
    description: '请求压缩处理器',
    debug: true,
    host: 'localhost',
    session_secret: 'secret',
    auth_cookie_name: 'secret',
    version: '0.0.1',
    environment: "development",
    dirname: "E:/nodetest/",
    optimize: "none",
    requireLib: "minirequire",
    fullrequireLib: "fullrequire",
    rport: "7503",
    rhost: '172.16.244.182',
    redis_dbindex: '0',
    mailHost: "smtp.qq.com",
    mailPort: "465",
    mailFrom: "Redis connection failed <leju_node@qq.com>", //邮箱这里需要和auto的填写user邮箱一致
    mailTo: "guanjia@leju.com,lingyun@leju.com",
    mailSubject: "From Node imgCdn Project",
    mailHtml: "<b>Redis connection failed</b>"
}