.PHONY: dev
dev:
	python3 -m http.server -d public/ -b 0.0.0.0 3000

.PHONY: deploy
deploy:
	aws s3 sync --delete build s3://ephjos-com
	aws amplify start-deployment --app-id d1icotrj6w74gb --branch-name main --source-url s3://ephjos-com --source-url-type BUCKET_PREFIX

.PHONY: update
update:
	python3 update.py

