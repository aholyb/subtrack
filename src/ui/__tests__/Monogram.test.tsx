import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { Monogram } from '../Monogram';

describe('Monogram', () => {
  it('показывает первую букву названия в верхнем регистре', async () => {
    await render(<Monogram name="netflix" color="#E50914" />);
    expect(screen.getByText('N')).toBeTruthy();
  });

  it('не падает на пустом названии', async () => {
    await render(<Monogram name="" color="#E50914" />);
    expect(screen.getByTestId('monogram')).toBeTruthy();
  });

  it('работает с кириллицей', async () => {
    await render(<Monogram name="Яндекс Плюс" color="#FFCC00" />);
    expect(screen.getByText('Я')).toBeTruthy();
  });
});
