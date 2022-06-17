
.PHONY: dev
dev:
	./bin/update
	bash ephjos.io -c 0

.PHONY: push
push:
	sh ./bin/update
	git add -A
	git commit
	docker-compose build
	docker-compose push
	git push
