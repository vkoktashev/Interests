import {NumberParam, StringParam} from 'use-query-params';

export const DEFAULT_PAGE_SIZE = 25;
export const PAGE_SIZES = [5, 10, 25, 50, 100];

export const CommaArrayParam = {
	encode: (values?: string[] | null) => (values?.length ? values.join(',') : undefined),
	decode: (value?: string | (string | null)[] | null): string[] => {
		const raw = Array.isArray(value) ? value.join(',') : value;
		return raw ? raw.split(',').filter(Boolean) : [];
	},
};

export const LIST_QUERY_PARAMS = {
	status: CommaArrayParam,
	sort: StringParam,
	q: StringParam,
	page: NumberParam,
	size: NumberParam,
};

export const EMPTY_LIST_QUERY = {
	status: undefined,
	sort: undefined,
	q: undefined,
	page: undefined,
	size: undefined,
};
