import pandas as pd

pd.set_option('display.max_rows', None)
pd.set_option('display.width', None)
pd.set_option('display.max_colwidth', None)

# Load EUR exchange rates
# Source: https://www.kaggle.com/code/gpreda/starter-kernel-annual-euro-exchange-rates/notebook
annually_df = pd.read_csv("ert_bil_eur_a.tsv", sep='\t')

# Preprocess exchange data 
pivot_data_col = annually_df.columns[0]
time_columns = annually_df.columns[1:]

annually_df['statinfo'] = annually_df[pivot_data_col].apply(lambda x: x.split(",")[0])
annually_df['unit']     = annually_df[pivot_data_col].apply(lambda x: x.split(",")[1])
annually_df['currency'] = annually_df[pivot_data_col].apply(lambda x: x.split(",")[2])

selected_columns = list(['statinfo', 'unit', 'currency']) +  list(time_columns)
annually_df = annually_df[selected_columns]

annually_tr_df = annually_df.melt(id_vars=['statinfo', 'unit', 'currency'],
        var_name="date",
        value_name="value")

annually_tr_df['date'] = annually_tr_df['date'].apply(lambda x: int(x))
annually_tr_df['value'] = annually_tr_df['value'].apply(lambda x: str(x).replace(": ", "NAN"))
annually_tr_df['value'] = annually_tr_df['value'].apply(lambda x: float(x))

annually_tr_df = annually_tr_df[annually_tr_df['date'] == 2018][annually_tr_df['statinfo'] == 'AVG']

# Manually add missing currencies
# CUP: exchange date for 30/03/2018
# IMP: current exchange date (11/11/2022)
additional_currencies = pd.DataFrame({'statinfo': ['AVG', 'AVG'],
                       'unit': ['NAC', 'NAC'], 
                       'currency': ['CUP', 'IMP'], 
                       'date': [2018, 2018], 
                       'value': [32.66749, 0.87553]})
annually_tr_df = pd.concat([annually_tr_df, additional_currencies], ignore_index=True)
annually_tr_df.reset_index()

# =============================================================================================
# Load StackOverflow survey results
# Source: https://www.kaggle.com/datasets/stackoverflow/stack-overflow-2018-developer-survey
df = pd.read_csv('survey_results_public.csv', sep=',')

df = df[['Age', 'CompTotal', 'CompFreq', 'Currency', 'Country', 'DevType']]

# Get rid of NaN values

df = df[df['CompTotal'].notnull()]
df = df[df['CompFreq'].notnull()]
df = df[df['Currency'].notnull()]
df = df[df['Country'].notnull()]
df = df[df['DevType'].notnull()]

# Convert all types of income to monthly

df.loc[df['CompFreq'] == 'Yearly', 'CompTotal'] = df['CompTotal'].apply(lambda x : x / 12)
df.loc[df['CompFreq'] == 'Weekly', 'CompTotal'] = df['CompTotal'].apply(lambda x : x * 4.3333)
df['CompFreq'] = 'Monthly' 

# Change currency to its short code only
df['Currency'] = df['Currency'].apply(lambda x: x.split()[0])

# Apply exchange rates

def apply_exchange_rate(value, currency):
    if currency in annually_tr_df['currency'].values:
        exchange_rate = annually_tr_df[annually_tr_df['currency'] == currency]['value'].iloc[0]
        return value / exchange_rate, 'EUR'
    return value, currency

df[['CompTotal', 'Currency']] = df.apply(lambda x: apply_exchange_rate(x['CompTotal'], x['Currency']), axis=1, result_type="expand")

# Remove outliers
df = df[df['CompTotal'] < 30000] 

# Change country names to match names in SVG file
df.loc[df['Country'] == "United States of America", 'Country'] = "USA" 
df.loc[df['Country'] == "United Kingdom of Great Britain and Northern Ireland", 'Country'] = "England" 
df.loc[df['Country'] == "Russian Federation", 'Country'] = "Russia" 
df.loc[df['Country'] == "Congo", 'Country'] = "Democratic Republic of the Congo" 
df.loc[df['Country'] == "Lao People's Democratic Republic", 'Country'] = "Laos" 
df.loc[df['Country'] == "Iran, Islamic Republic of...", 'Country'] = "Iran" 
df.loc[df['Country'] == "Republic of Moldova", 'Country'] = "Moldova" 
df.loc[df['Country'] == "Venezuela, Bolivarian Republic of...", 'Country'] = "Venezuela" 
df.loc[df['Country'] == "Libyan Arab Jamahiriya", 'Country'] = "Libya" 
df.loc[df['Country'] == "Côte d'Ivoire", 'Country'] = "Ivory Coast" 
df.loc[df['Country'] == "Mauritius", 'Country'] = "Mauritania" 
df.loc[df['Country'] == "Viet Nam", 'Country'] = "Vietnam" 
df.loc[df['Country'] == "Serbia", 'Country'] = "Republic of Serbia" 

# Save dataset
df.to_csv('data.csv')


