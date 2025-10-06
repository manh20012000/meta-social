// src/modules/search/user-search.service.ts
import { Inject, Injectable } from '@nestjs/common';
import { ElasticsearchService } from '@nestjs/elasticsearch';

interface ElasticsearchHit {
  _id: string;
  _source: any;
  _score?: number;
  highlight?: any;
}

interface UserData {
  user_id: string;
  name?: string;
  email?: string;
  avatar?: string;
  status?: string;
  createdAt?: Date | string;
}

interface SearchResult {
  _id: string;
  name: string;
  avatar: string | null;
  phone?: string;
}

interface PaginatedResult {
  data: SearchResult[];
  total: number;
}

@Injectable()
export class UserElasticsearchService {
  private readonly index = 'users'; // alias
  constructor(
    @Inject(ElasticsearchService)
    private readonly es: ElasticsearchService,
  ) {}
  // Gọi 1 lần khi khởi động app (onModuleInit) để chắc chắn index/mapping tồn tại
  async ensureIndex() {
    try {
      const index = this.index;
      const exists = await this.es.indices.exists({ index });
      if (exists) return;

      await this.es.indices.create({
        index,
        settings: {
          analysis: {
            normalizer: {
              lowercase_normalizer: { type: 'custom', filter: ['lowercase'] },
            },
            filter: {
              // loại bỏ dấu (tiếng Việt dùng ascii folding đơn giản)
              vn_asciifolding: {
                type: 'asciifolding',
                preserve_original: true,
              },
              edge_ngram_filter: {
                type: 'edge_ngram',
                min_gram: 2,
                max_gram: 20,
              },
            },
            analyzer: {
              vn_text: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'vn_asciifolding'],
              },
              edge_ngram_analyzer: {
                type: 'custom',
                tokenizer: 'standard',
                filter: ['lowercase', 'vn_asciifolding', 'edge_ngram_filter'],
              },
            },
          },
        },
        mappings: {
          properties: {
            user_id: { type: 'keyword' },
            name: {
              type: 'text',
              analyzer: 'vn_text',
              search_analyzer: 'vn_text',
              fields: {
                raw: { type: 'keyword', normalizer: 'lowercase_normalizer' }, // exact
                ngram: {
                  type: 'text',
                  analyzer: 'edge_ngram_analyzer',
                  search_analyzer: 'vn_text',
                }, // prefix
              },
            },
            email: {
              type: 'text',
              analyzer: 'vn_text',
              fields: {
                raw: { type: 'keyword', normalizer: 'lowercase_normalizer' },
              },
            },
            avatar: { type: 'keyword', index: false },
            status: { type: 'keyword' },
            createdAt: { type: 'date' },
            // ⛔️ KHÔNG index phone vào ES theo yêu cầu
          },
        },
      });

      // Nếu muốn dùng alias ngoài tên index thực tế:
      // await this.es.indices.updateAliases({ body: { actions: [{ add: { index, alias: 'users' } }] } });
    } catch (error) {
      throw new Error(`Failed to ensure index: ${error.message}`);
    }
  }

  async indexUser(u: UserData) {
    try {
      return await this.es.index({
        index: this.index,
        id: u.user_id,
        document: {
          ...u,
          createdAt: u.createdAt
            ? typeof u.createdAt === 'string'
              ? u.createdAt
              : u.createdAt.toISOString()
            : new Date().toISOString(),
        },
        refresh: false, // nhanh; dùng refresh:'wait_for' nếu test cần thấy ngay
      });
    } catch (error) {
      throw new Error(`Failed to index user: ${error.message}`);
    }
  }

  async deleteUser(id: string) {
    try {
      return await this.es.delete({ index: this.index, id });
    } catch (error) {
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // ===================== EMAIL EXACT (dùng bởi user.service) =====================
  async searchEmailExact(
    q: string,
    skip = 0,
    limit = 20,
  ): Promise<PaginatedResult> {
    if (!q || q.trim().length === 0) {
      return { data: [], total: 0 };
    }

    try {
      const res = await this.es.search({
        index: this.index,
        from: skip,
        size: limit,
        query: {
          bool: {
            should: [
              { term: { 'email.raw': q.toLowerCase() } }, // exact
              // fallback nhẹ khi email bị phân tích (ít xảy ra)
              { match: { email: { query: q, operator: 'and' } } },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }],
      });

      const hits = (res.hits?.hits ?? []) as ElasticsearchHit[];
      const total =
        typeof res.hits?.total === 'number'
          ? res.hits.total
          : ((res.hits?.total as any)?.value ?? hits.length);

      const data = hits.map((h) => {
        const s = h._source || {};
        return {
          _id: h._id, // Sử dụng h._id thay vì s.user_id
          name: s.name ?? '',
          avatar: s.avatar ?? null,
        };
      });

      return { data, total: Number(total) };
    } catch (error) {
      throw new Error(`Failed to search email: ${error.message}`);
    }
  }

  // ===================== TEXT GẦN ĐÚNG (dùng bởi user.service) =====================
  async searchText(q: string, skip = 0, limit = 20): Promise<PaginatedResult> {
    if (!q || q.trim().length === 0) {
      return { data: [], total: 0 };
    }

    try {
      const res = await this.es.search({
        index: this.index,
        from: skip,
        size: limit,
        query: {
          bool: {
            should: [
              // boost nếu trùng hẳn
              { term: { 'name.raw': q.toLowerCase() } },
              // prefix/paste thiếu
              {
                match_phrase_prefix: {
                  'name.ngram': { query: q, max_expansions: 50 },
                },
              },
              // fuzzy nhẹ
              {
                multi_match: {
                  query: q,
                  type: 'best_fields',
                  fields: ['name^3', 'email^2'],
                  operator: 'or',
                  fuzziness: 'AUTO',
                },
              },
            ],
            minimum_should_match: 1,
          },
        },
        sort: [{ _score: { order: 'desc' } }, { createdAt: { order: 'desc' } }],
        highlight: {
          pre_tags: ['<em>'],
          post_tags: ['</em>'],
          fields: { name: {}, email: {} },
        },
      });

      const hits = (res.hits?.hits ?? []) as ElasticsearchHit[];
      const total =
        typeof res.hits?.total === 'number'
          ? res.hits.total
          : ((res.hits?.total as any)?.value ?? hits.length);

      const data = hits.map((h) => {
        const s = h._source || {};
        return {
          _id: h._id, // Sử dụng h._id thay vì s.user_id
          name: s.name ?? '',
          avatar: s.avatar ?? null,
          // nếu UI cần highlight thì đưa thêm:
          // highlight: h.highlight,
        };
      });

      return { data, total: Number(total) };
    } catch (error) {
      throw new Error(`Failed to search text: ${error.message}`);
    }
  }

  // ===================== (tuỳ chọn) GIỮ CÁC HÀM CŨ =====================
  async searchByName(q: string, limit = 20) {
    if (!q || q.trim().length === 0) {
      return { hits: { hits: [], total: 0 } };
    }

    try {
      return await this.es.search({
        index: this.index,
        size: limit,
        query: {
          bool: {
            must: [
              {
                multi_match: {
                  query: q,
                  type: 'best_fields',
                  fields: ['name^3', 'name.raw^5'],
                  operator: 'or',
                  fuzziness: 'AUTO',
                },
              },
            ],
          },
        },
      });
    } catch (error) {
      throw new Error(`Failed to search by name: ${error.message}`);
    }
  }

  async searchByNamePaged(
    q: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResult> {
    if (!q || q.trim().length === 0) {
      return { data: [], total: 0 };
    }

    if (page < 1) page = 1;
    if (limit < 1 || limit > 100) limit = 10;

    try {
      const from = (page - 1) * limit;
      const res = await this.es.search({
        index: this.index,
        from,
        size: limit,
        query: {
          multi_match: {
            query: q,
            type: 'best_fields',
            fields: ['name^3', 'name.raw^5'],
            operator: 'or',
            fuzziness: 'AUTO',
          },
        },
      });

      const hits = (res.hits?.hits ?? []) as ElasticsearchHit[];
      const total =
        typeof res.hits?.total === 'number'
          ? res.hits.total
          : ((res.hits?.total as any)?.value ?? hits.length);

      const data = hits.map((h) => {
        const src = h._source || {};
        return {
          _id: h._id, // Sử dụng h._id thay vì src._id
          name: src.name ?? '',
          avatar: src.avatar ?? null,
          // phone bỏ vì không search qua ES nữa
        };
      });

      return { data, total: Number(total) };
    } catch (error) {
      throw new Error(`Failed to search by name paged: ${error.message}`);
    }
  }
}
