'use client';

import { Button } from '@lavanda/ui';
import { Card, CardHeader, CardTitle, CardContent } from '@lavanda/ui';
import { Grid, Container } from '@lavanda/ui';
import { useTheme } from '@lavanda/ui';
import { useLocale } from '@lavanda/ui';
import { en } from '@lavanda/i18n';
import { ar } from '@lavanda/i18n';

export default function Home() {
  const { theme, isDark, toggle: toggleTheme, isLoaded: themeLoaded } = useTheme();
  const { locale, isArabic, toggle: toggleLocale } = useLocale();
  
  const t = isArabic ? ar : en;

  if (!themeLoaded) return null;

  return (
    <Container maxWidth="xl" className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t.settings.pharmacyName}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t.dashboard.overview}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLocale}
          >
            {isArabic ? 'English' : 'العربية'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={toggleTheme}
          >
            {isDark ? t.settings.lightMode : t.settings.darkMode}
          </Button>
        </div>
      </div>

      {/* Dashboard Grid */}
      <Grid cols={4} gap="md" className="mb-8">
        <Card variant="elevated">
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {t.dashboard.todaySales}
            </p>
            <p className="text-3xl font-bold text-primary-600">IQD 0</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {t.dashboard.totalProducts}
            </p>
            <p className="text-3xl font-bold text-secondary-600">0</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {t.dashboard.lowStock}
            </p>
            <p className="text-3xl font-bold text-warning-500">0</p>
          </CardContent>
        </Card>

        <Card variant="elevated">
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {t.dashboard.orders}
            </p>
            <p className="text-3xl font-bold text-success-600">0</p>
          </CardContent>
        </Card>
      </Grid>

      {/* Welcome Card */}
      <Card variant="outlined" padding="lg">
        <CardHeader>
          <CardTitle>{t.auth.welcome} 👋</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Lavanda Pharmacy POS is ready for configuration. Start by adding products and setting up your inventory.
          </p>
          <div className="flex gap-4">
            <Button variant="primary">
              {t.products.addProduct}
            </Button>
            <Button variant="secondary">
              {t.sales.newSale}
            </Button>
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
