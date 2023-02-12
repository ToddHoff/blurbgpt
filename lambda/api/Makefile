install: test prod

test: build tinstall

prod: build pinstall

build: clean
	zip -r index.zip index.js VerifyUrl.js views lib node_modules

clean:
	rm -f index.zip

tinstall:
	aws lambda update-function-code --function-name testApi --zip-file fileb://index.zip
	make clean

pinstall:
	aws lambda update-function-code --function-name prodApi --zip-file fileb://index.zip
	make clean

itest:
	aws lambda invoke --function-name testApi out --log-type Tail

iprod:
	aws lambda invoke --function-name prodApi out --log-type Tail

tlog:
	awslogs get /aws/lambda/testApi --start='1 day' > log

plog:
	awslogs get /aws/lambda/testApi --start='1 day' > log

dtlog:
	delog /aws/lambda/testApi

dplog:
	delog /aws/lambda/prodApi

dtrslog:
	delog /aws/lambda/testReportScheduler
