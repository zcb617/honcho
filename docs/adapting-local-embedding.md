# 适配本地 Embedding 模型说明

## 背景

项目支持本地 Embedding 服务（通过 `LLM_OPENAI_COMPATIBLE_BASE_URL` 配置），但部分配置项未暴露为参数，需要修改代码才能使用本地模型。

---

## 遇到的问题

### 问题一：模型名称硬编码

**现象：** 无法通过环境变量指定 Embedding 模型名称。

**原因：** `src/embedding_client.py` 中模型名称是硬编码的，`LLM_EMBEDDING_PROVIDER` 只能选择 provider，不能选择模型。

```python
# src/embedding_client.py

# OpenAI (第64行)
self.model = "text-embedding-3-small"

# OpenRouter (第55行)
self.model = "openai/text-embedding-3-small"

# Gemini (第38行)
self.model = "gemini-embedding-001"
```

**解决方案：**

修改 `src/embedding_client.py` 对应 provider 的模型名称。

例如，将 OpenRouter 改为使用 `nomic-embed-text`：

```python
# 第55行，修改前
self.model = "openai/text-embedding-3-small"

# 修改后
self.model = "openai/nomic-embed-text"
```

### 问题二：向量维度不匹配

**现象：**

```
ValueError: expected 1536 dimensions, not 768
sqlalchemy.exc.PendingRollbackError: ... expected 1536 dimensions, not 768
```

**原因：** `nomic-embed-text` 输出 768 维向量，但数据库表结构和 SQLAlchemy 模型定义为 1536 维（`text-embedding-3-small` 的维度）。

## 解决步骤

### 1. 修改 SQLAlchemy 模型定义

编辑 `src/models.py`，将两处 `Vector(1536)` 改为 `Vector(768)`：

```python
# src/models.py
# 第281行 - message_embeddings 表
embedding: MappedColumn[Any] = mapped_column(Vector(768), nullable=True)

# 第389行 - documents 表
embedding: MappedColumn[Any] = mapped_column(Vector(768), nullable=True)
```

### 2. 修改数据库列类型

> **注意：** 此操作会清空向量表数据（`message_embeddings`、`documents`），其他表（workspaces、peers、sessions、messages 等）不受影响。

```sql
-- 修改 message_embeddings 表
ALTER TABLE public.message_embeddings ALTER COLUMN embedding TYPE vector(768);
TRUNCATE TABLE public.message_embeddings;

-- 修改 documents 表
ALTER TABLE public.documents ALTER COLUMN embedding TYPE vector(768);
TRUNCATE TABLE public.documents;
```

通过 Docker 执行：

```bash
docker compose exec db psql -U postgres -d postgres -c "
ALTER TABLE public.message_embeddings ALTER COLUMN embedding TYPE vector(768);
TRUNCATE TABLE public.message_embeddings;
ALTER TABLE public.documents ALTER COLUMN embedding TYPE vector(768);
TRUNCATE TABLE public.documents;
"
```

### 3. 重新构建并启动服务

代码修改后需要重新构建镜像：

```bash
docker compose down
docker compose up -d --build
```

### 4. 验证

```bash
docker compose logs -f api-1
```

确认服务启动正常，不再出现维度不匹配的错误。

---

## 各模型维度对照

| 模型 | 维度 |
|------|------|
| `text-embedding-3-small` | 1536 |
| `text-embedding-3-large` | 3072 |
| `nomic-embed-text` | 768 |
| `gemini-embedding-001` | 768 |

---

## 总结

- 项目目前将模型名称和向量维度硬编码在代码中，使用本地模型需要同时修改三处：`embedding_client.py`（模型名）、`models.py`（向量维度）、数据库列类型
- 已提交 [Issue #554](https://github.com/plastic-labs/honcho/issues/554) 建议增加 `LLM_EMBEDDING_MODEL` 配置参数
- 已有配置项 `VECTOR_STORE_DIMENSIONS` 目前仅用于 LanceDB，尚未用于 SQLAlchemy 模型定义
