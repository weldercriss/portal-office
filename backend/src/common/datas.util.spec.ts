import { anosCompletosEm, diasAteProximaOcorrencia } from './datas.util';

describe('diasAteProximaOcorrencia', () => {
  it('returns days remaining later this year', () => {
    const hoje = new Date('2026-09-02T00:00:00Z');
    const dataBase = new Date('1995-09-07T00:00:00Z');
    expect(diasAteProximaOcorrencia(dataBase, hoje)).toBe(5);
  });

  it('rolls over to next year when the date already passed', () => {
    const hoje = new Date('2026-09-02T00:00:00Z');
    const dataBase = new Date('1995-01-10T00:00:00Z');
    expect(diasAteProximaOcorrencia(dataBase, hoje)).toBe(130);
  });

  it('returns 0 when the occurrence is today', () => {
    const hoje = new Date('2026-09-02T00:00:00Z');
    const dataBase = new Date('1995-09-02T00:00:00Z');
    expect(diasAteProximaOcorrencia(dataBase, hoje)).toBe(0);
  });

  it('handles Feb 29 birthdays falling back to Feb 28 in non-leap years', () => {
    const hoje = new Date('2027-02-01T00:00:00Z');
    const dataBase = new Date('1996-02-29T00:00:00Z');
    expect(diasAteProximaOcorrencia(dataBase, hoje)).toBe(27);
  });
});

describe('anosCompletosEm', () => {
  it('counts a full year once the anniversary already happened this year', () => {
    expect(anosCompletosEm(new Date('2020-03-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z'))).toBe(6);
  });

  it('does not count the current year until the anniversary happens', () => {
    expect(anosCompletosEm(new Date('2020-12-01T00:00:00Z'), new Date('2026-09-02T00:00:00Z'))).toBe(5);
  });
});
