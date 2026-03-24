// Server-side only — never import this in client components.
// Use dynamic import in API routes: await import('@/lib/pdf-generator')

import React from 'react';

/**
 * generateResultsPDF
 * Creates a multi-page PDF from assessment results using @react-pdf/renderer.
 * Uses React.createElement (no JSX) since this is a .ts file.
 * Returns empty Buffer on failure — never throws.
 */
export async function generateResultsPDF(
  results: Record<string, unknown>
): Promise<Buffer> {
  try {
    const { Document, Page, Text, View, StyleSheet, pdf } = await import(
      '@react-pdf/renderer'
    );

    const colors = {
      primary: '#2563EB',
      secondary: '#7A9E7E',
      dark: '#2C2C2C',
      subtle: '#6B6B6B',
      bg: '#FAF8F5',
      white: '#FFFFFF',
      darkBg: '#3D2B1F',
      lightAccent: '#EFF6FF',
    };

    const styles = StyleSheet.create({
      page: {
        backgroundColor: colors.bg,
        padding: 48,
        fontFamily: 'Helvetica',
      },
      darkPage: {
        backgroundColor: colors.darkBg,
        padding: 48,
        fontFamily: 'Helvetica',
      },
      card: {
        backgroundColor: colors.white,
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
      },
      label: {
        fontSize: 8,
        color: colors.subtle,
        textTransform: 'uppercase',
        letterSpacing: 1.5,
        marginBottom: 6,
      },
      h1: { fontSize: 48, color: colors.primary, fontFamily: 'Helvetica-Bold' },
      h2: { fontSize: 22, color: colors.dark, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
      h3: { fontSize: 14, color: colors.dark, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
      body: { fontSize: 11, color: colors.dark, lineHeight: 1.7 },
      subtle: { fontSize: 10, color: colors.subtle },
      accent: { fontSize: 11, color: colors.primary },
      divider: { height: 1, backgroundColor: '#E8E4E0', marginVertical: 12 },
      row: { flexDirection: 'row', gap: 12 },
      col: { flex: 1 },
      tag: {
        backgroundColor: '#E8F0E8',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 4,
        marginRight: 6,
        marginBottom: 6,
      },
      tagText: { fontSize: 9, color: colors.secondary },
      brandHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
      },
      brandName: { fontSize: 14, color: colors.primary, fontFamily: 'Helvetica-Bold' },
      brandTagline: { fontSize: 9, color: colors.subtle, fontStyle: 'italic' },
    });

    const r = results;
    const leadingType = r.leading_type as number;
    const typeName = (r.type_name as string) ?? `Type ${leadingType}`;
    const dsName = (r.defiant_spirit_type_name as string) ?? '';
    const confidence = r.confidence_pct as number;
    const wing = (r.wing as string) ?? '';
    const variant = (r.instinctual_variant as string) ?? '';
    const tritype = (r.tritype as string) ?? '';
    const headline = (r.headline as string) ?? '';
    const superpower = (r.superpower as string) ?? '';
    const kryptonite = (r.kryptonite as string) ?? '';
    const reactPattern = (r.react_pattern as string) ?? '';
    const respondPathway = (r.respond_pathway as string) ?? '';
    const defy = (r.defy_your_number as string) ?? '';
    const closing = (r.closing_charge as string) ?? 'Defy Your Number. Live Your Spirit.';
    const oyn = (r.oyn_summary as Record<string, string>) ?? {};
    const centerInsights = (r.center_insights as Record<string, string>) ?? {};
    const domainInsights = (r.domain_insights as Array<{ domain: string; insight: string }>) ?? [];
    const famousExamples = (r.famous_examples as string[]) ?? [];
    const famousDisclaimer = (r.famous_examples_disclaimer as string) ?? '';

    const BrandHeader = React.createElement(
      View,
      { style: styles.brandHeader },
      React.createElement(Text, { style: styles.brandName }, 'Soulo Enneagram'),
      React.createElement(Text, { style: styles.brandTagline }, 'Defy Your Number. Live Your Spirit.')
    );

    // Page 1: Cover — Type Identity
    const page1 = React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      BrandHeader,
      React.createElement(
        View,
        { style: styles.card },
        React.createElement(Text, { style: styles.label }, 'Your Enneagram Type'),
        React.createElement(
          View,
          { style: { flexDirection: 'row', alignItems: 'flex-end', gap: 16, marginBottom: 12 } },
          React.createElement(Text, { style: styles.h1 }, String(leadingType)),
          React.createElement(
            View,
            null,
            React.createElement(Text, { style: styles.h2 }, typeName),
            dsName
              ? React.createElement(Text, { style: { fontSize: 11, color: colors.secondary } }, dsName)
              : null,
            wing ? React.createElement(Text, { style: styles.subtle }, `Wing: ${wing}`) : null,
            variant ? React.createElement(Text, { style: styles.subtle }, `Variant: ${variant}`) : null,
            tritype ? React.createElement(Text, { style: styles.subtle }, `Tritype: ${tritype}`) : null
          )
        ),
        React.createElement(View, { style: styles.divider }),
        React.createElement(
          Text,
          { style: { ...styles.accent, fontStyle: 'italic', textAlign: 'center' } },
          `Confidence: ${confidence}%`
        )
      ),
      headline
        ? React.createElement(
            View,
            { style: { ...styles.card, backgroundColor: colors.lightAccent } },
            React.createElement(Text, { style: { ...styles.body, fontStyle: 'italic', color: colors.primary } }, headline)
          )
        : null,
      famousExamples.length > 0
        ? React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.label }, 'Famous Examples'),
            React.createElement(
              Text,
              { style: { ...styles.body, marginBottom: 4 } },
              famousExamples.join(', ')
            ),
            famousDisclaimer
              ? React.createElement(Text, { style: { fontSize: 8, color: colors.subtle, fontStyle: 'italic' } }, famousDisclaimer)
              : null
          )
        : null
    );

    // Page 2: Superpower + Kryptonite
    const page2 = React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      BrandHeader,
      superpower
        ? React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.label }, 'Your Superpower'),
            React.createElement(Text, { style: styles.body }, superpower)
          )
        : null,
      kryptonite
        ? React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.label }, 'Your Kryptonite'),
            React.createElement(Text, { style: styles.body }, kryptonite)
          )
        : null
    );

    // Page 3: React / Respond
    const page3 = React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      BrandHeader,
      reactPattern
        ? React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.label }, 'How You React'),
            React.createElement(Text, { style: styles.body }, reactPattern)
          )
        : null,
      respondPathway
        ? React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.label }, 'How You Respond'),
            React.createElement(Text, { style: styles.body }, respondPathway)
          )
        : null
    );

    // Page 4: OYN Dimensions
    const oynEntries = Object.entries(oyn).filter(([, v]) => v && v.trim());
    const page4 = React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      BrandHeader,
      React.createElement(Text, { style: { ...styles.h3, marginBottom: 16 } }, 'OYN Dimensions'),
      ...oynEntries.map(([key, value]) =>
        React.createElement(
          View,
          { style: { ...styles.card, marginBottom: 10 } },
          React.createElement(Text, { style: { ...styles.label, color: colors.primary } }, key.toUpperCase()),
          React.createElement(Text, { style: styles.body }, value)
        )
      ),
      Object.keys(centerInsights).length > 0
        ? React.createElement(
            View,
            { style: styles.card },
            React.createElement(Text, { style: styles.label }, 'Center Insights'),
            ...Object.entries(centerInsights).map(([center, insight]) =>
              React.createElement(
                View,
                { style: { marginBottom: 8 } },
                React.createElement(Text, { style: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: colors.dark, textTransform: 'capitalize' } }, center),
                React.createElement(Text, { style: styles.body }, insight)
              )
            )
          )
        : null
    );

    // Page 5: Domain Insights + Defy Your Number
    const page5 = React.createElement(
      Page,
      { size: 'A4', style: styles.page },
      BrandHeader,
      domainInsights.length > 0
        ? React.createElement(
            View,
            { style: { marginBottom: 16 } },
            React.createElement(Text, { style: { ...styles.h3, marginBottom: 12 } }, 'Domain Insights'),
            ...domainInsights.slice(0, 4).map((di) =>
              React.createElement(
                View,
                { style: { ...styles.card, marginBottom: 10 } },
                React.createElement(Text, { style: styles.label }, di.domain),
                React.createElement(Text, { style: styles.body }, di.insight)
              )
            )
          )
        : null,
      defy
        ? React.createElement(
            View,
            { style: { ...styles.card, backgroundColor: colors.darkBg, marginBottom: 16 } },
            React.createElement(Text, { style: { ...styles.label, color: '#60A5FA' } }, 'Defy Your Number'),
            React.createElement(Text, { style: { ...styles.body, color: colors.bg } }, defy)
          )
        : null,
      React.createElement(
        View,
        { style: { padding: 16, alignItems: 'center' } },
        React.createElement(
          Text,
          { style: { fontSize: 13, color: colors.primary, fontStyle: 'italic', textAlign: 'center' } },
          closing
        )
      )
    );

    const doc = React.createElement(
      Document,
      null,
      page1,
      page2,
      page3,
      page4,
      page5
    );

    const pdfInstance = pdf(doc);
    const blob = await pdfInstance.toBlob();
    const arrayBuffer = await blob.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    console.error('[pdf-generator] Error:', err);
    return Buffer.alloc(0);
  }
}
