ProgramPrivateKey(Slurp('/etc/letsencrypt/live/ephjos-ecdsa/privkey.pem'))
ProgramCertificate(Slurp('/etc/letsencrypt/live/ephjos-ecdsa/fullchain.pem'))
ProgramPrivateKey(Slurp('/etc/letsencrypt/live/ephjos-rsa/privkey.pem'))
ProgramCertificate(Slurp('/etc/letsencrypt/live/ephjos-rsa/fullchain.pem'))
if IsDaemon() then
   ProgramUid(33)
   ProgramGid(33)
   ProgramPort(80)
   ProgramPort(443)
   ProgramLogPath('/var/log/ephjos.io.log')
   ProgramPidPath('/var/run/ephjos.io.pid')
   SetLogLevel(kLogError)
end

function OnServerStart()
    ProgramTokenBucket()
    assert(unix.setrlimit(unix.RLIMIT_NPROC, 1000, 1000))
end

function OnHttpRequest()

   if GetScheme() == 'http' then
     ServeRedirect(301, GetUrl():gsub("^http://", "https://"))
   else
     Route()
   end

   SetHeader('Content-Language', 'en-US')
end

