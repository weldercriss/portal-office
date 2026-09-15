import { beforeEach, describe, expect, it, vi } from 'vitest';
import { httpClient } from '../../../api/httpClient';
import {
  createDepartamento,
  deactivateDepartamento,
  getDepartamentos,
  updateDepartamento,
} from './departamentos.api';

vi.mock('../../../api/httpClient', () => ({ httpClient: vi.fn().mockResolvedValue({}) }));

const httpClientMock = vi.mocked(httpClient);

describe('departamentos.api', () => {
  beforeEach(() => {
    httpClientMock.mockClear();
  });

  it('lists departments from /groups', () => {
    getDepartamentos();
    expect(httpClientMock).toHaveBeenCalledWith('/groups?all=true');
  });

  it('creates a department with POST', () => {
    createDepartamento({ nome: 'Financeiro' });
    expect(httpClientMock).toHaveBeenCalledWith('/groups', { method: 'POST', body: { nome: 'Financeiro' } });
  });

  it('updates a department with PATCH', () => {
    updateDepartamento('g1', { nome: 'RH' });
    expect(httpClientMock).toHaveBeenCalledWith('/groups/g1', { method: 'PATCH', body: { nome: 'RH' } });
  });

  it('deactivates a department with DELETE', () => {
    deactivateDepartamento('g1');
    expect(httpClientMock).toHaveBeenCalledWith('/groups/g1', { method: 'DELETE' });
  });
});
