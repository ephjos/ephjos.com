
.PHONY: dev
dev:
	browser-sync start --no-open --no-ui --watch --files "**/*" --proxy localhost:5001 & \
		docker-compose up --build & \
		wait; \

.PHONY: push
push:
	sh ./bin/update
	git add -A
	git commit
	docker-compose build
	docker-compose push
	git push
